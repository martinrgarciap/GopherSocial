package ratelimiter

import (
	"sync"
	"time"
)

type SlidingWindowCounterRateLimiter struct {
	sync.RWMutex
	clients      map[string]*SlidingWindowCounter
	rate         float64
	interval     time.Duration
	timeProvider TimeProvider
}

// NewSlidingWindowCounterLimiter creates one sliding window limiter with a clients map.
// This follows the same general shape as NewFixedWindowLimiter:
// - one limiter owns the shared clients map
// - each client IP gets its own SlidingWindowCounter
// - SlidingWindowAllow checks and updates only that client's counter
func NewSlidingWindowCounterLimiter(rate float64, interval time.Duration, tp TimeProvider) *SlidingWindowCounterRateLimiter {
	if rate <= 0 {
		rate = 1
	}
	if interval <= 0 {
		interval = time.Second
	}
	if tp == nil {
		tp = &RealTimeProvider{}
	}

	return &SlidingWindowCounterRateLimiter{
		clients:      make(map[string]*SlidingWindowCounter),
		rate:         rate,
		interval:     interval,
		timeProvider: tp,
	}
}

func (rl *SlidingWindowCounterRateLimiter) SlidingWindowAllow(ip string) (bool, time.Duration) {
	rl.Lock()

	// 1. Look up this client's sliding window counter using their IP address.
	counter, exists := rl.clients[ip]
	if !exists {
		// 2. If this is the first request from this IP, create an empty counter for it.
		counter = NewSlidingWindowCounter(rl.rate, rl.interval, rl.timeProvider)
		rl.clients[ip] = counter
	}
	rl.Unlock()

	// The map lock is released now because each counter has its own mutex.
	counter.mu.Lock()
	defer counter.mu.Unlock()

	// 3. Check how far we are into the current window.
	now := counter.timeProvider.Now()
	elapsed := now.Sub(counter.windowStart)

	// 4. If one or more full windows passed, shift the counts forward.
	if elapsed >= counter.interval {
		windowsPassed := int(elapsed / counter.interval)

		if windowsPassed == 1 {
			counter.previousCount = counter.currentCount
		} else {
			counter.previousCount = 0
		}

		counter.currentCount = 0
		counter.windowStart = counter.windowStart.Add(time.Duration(windowsPassed) * counter.interval)
		elapsed = now.Sub(counter.windowStart)
	}

	// 5. Calculate the weighted count.
	// The previous window matters less as we move deeper into the current window.
	elapsedFraction := elapsed.Seconds() / counter.interval.Seconds()
	weightedCount := float64(counter.previousCount)*(1.0-elapsedFraction) + float64(counter.currentCount)
	if weightedCount < 0 {
		weightedCount = 0
	}

	// 6. If the weighted count is under the limit, count this request and allow it.
	if weightedCount < counter.rate {
		counter.currentCount++
		return true, 0
	}

	// 7. Otherwise, reject the request and estimate when the weighted count should drop.
	retryAfter := counter.interval - elapsed
	if counter.previousCount > 0 && float64(counter.currentCount) < counter.rate {
		neededFraction := 1.0 - ((counter.rate - float64(counter.currentCount)) / float64(counter.previousCount))
		additionalFraction := neededFraction - elapsedFraction
		retryAfter = time.Duration(additionalFraction * float64(counter.interval))
	}

	if retryAfter <= 0 {
		retryAfter = time.Nanosecond
	}

	return false, retryAfter
}
