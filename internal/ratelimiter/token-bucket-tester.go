package ratelimiter

import (
	"sync"
	"time"
)

type TokenBucketRateLimiter struct {
	sync.RWMutex
	clients      map[string]*TokenBucket
	rate         float64
	capacity     float64
	timeProvider TimeProvider
}

// NewTokenBucketLimiter creates one token bucket limiter with a clients map.
// This follows the same general shape as NewFixedWindowLimiter:
// - one limiter owns the shared clients map
// - each client IP gets its own TokenBucket
// - TokenBucketAllow checks and updates only that client's bucket
func NewTokenBucketLimiter(rate float64, capacity float64, tp TimeProvider) *TokenBucketRateLimiter {
	if rate <= 0 {
		rate = 1
	}
	if capacity <= 0 {
		capacity = 1
	}
	if tp == nil {
		tp = &RealTimeProvider{}
	}

	return &TokenBucketRateLimiter{
		clients:      make(map[string]*TokenBucket),
		rate:         rate,
		capacity:     capacity,
		timeProvider: tp,
	}
}

func (rl *TokenBucketRateLimiter) TokenBucketAllow(ip string) (bool, time.Duration) {
	rl.Lock()

	// 1. Look up this client's token bucket using their IP address.
	bucket, exists := rl.clients[ip]
	if !exists {
		// 2. If this is the first request from this IP, create a full bucket for it.
		bucket = NewTokenBucket(rl.rate, rl.capacity, rl.timeProvider)
		rl.clients[ip] = bucket
	}
	rl.Unlock()

	// The map lock is released now because each bucket has its own mutex.
	bucket.mu.Lock()
	defer bucket.mu.Unlock()

	// 3. Calculate the number of tokens to add based on the time elapsed since last refill.
	now := bucket.timeProvider.Now()
	elapsed := now.Sub(bucket.lastRefill)

	// 4. Add tokens to the bucket, but never above capacity.
	tokensToAdd := elapsed.Seconds() * bucket.rate
	bucket.tokens = min(bucket.tokens+tokensToAdd, bucket.capacity)
	bucket.lastRefill = now

	// 5. If there is at least one token, consume one token and allow the request.
	if bucket.tokens >= 1 {
		bucket.tokens -= 1
		return true, 0
	}

	// 6. Otherwise, reject the request and calculate when one token should be available.
	tokensNeeded := 1 - bucket.tokens
	retryAfter := time.Duration((tokensNeeded / bucket.rate) * float64(time.Second))
	if retryAfter <= 0 {
		retryAfter = time.Nanosecond
	}

	return false, retryAfter
}
