package ratelimiter

import (
	"sync"
	"time"
)

type LeakyBucketRateLimiter struct {
	sync.RWMutex
	clients      map[string]*LeakyBucket
	rate         float64
	capacity     float64
	timeProvider TimeProvider
}

// NewLeakyBucketLimiter creates one leaky bucket limiter with a clients map.
// This follows the same general shape as NewFixedWindowLimiter:
// - one limiter owns the shared clients map
// - each client IP gets its own LeakyBucket
// - LeakyBucketAllow checks and updates only that client's bucket
func NewLeakyBucketLimiter(rate float64, capacity float64, tp TimeProvider) *LeakyBucketRateLimiter {
	if rate <= 0 {
		rate = 1
	}
	if capacity <= 0 {
		capacity = 1
	}
	if tp == nil {
		tp = &RealTimeProvider{}
	}

	return &LeakyBucketRateLimiter{
		clients:      make(map[string]*LeakyBucket),
		rate:         rate,
		capacity:     capacity,
		timeProvider: tp,
	}
}

func (rl *LeakyBucketRateLimiter) LeakyBucketAllow(ip string) (bool, time.Duration) {
	rl.Lock()

	// 1. Look up this client's leaky bucket using their IP address.
	bucket, exists := rl.clients[ip]
	if !exists {
		// 2. If this is the first request from this IP, create an empty bucket for it.
		bucket = NewLeakyBucket(rl.rate, rl.capacity, rl.timeProvider)
		rl.clients[ip] = bucket
	}
	rl.Unlock()

	// The map lock is released now because each bucket has its own mutex.
	bucket.mu.Lock()
	defer bucket.mu.Unlock()

	// 3. Calculate how much water leaked out since the last check.
	now := bucket.timeProvider.Now()
	elapsed := now.Sub(bucket.lastLeak)
	leakedAmount := elapsed.Seconds() * bucket.rate

	// 4. Remove leaked water from the bucket, but never below zero.
	bucket.water = max(bucket.water-leakedAmount, 0)
	bucket.lastLeak = now

	// 5. If there is room in the bucket, add one request's worth of water.
	if bucket.water < bucket.capacity {
		bucket.water += 1
		return true, 0
	}

	// 6. Otherwise, reject the request and calculate when water should leak enough.
	waterToLeak := bucket.water - bucket.capacity
	retryAfter := time.Duration((waterToLeak / bucket.rate) * float64(time.Second))
	if retryAfter <= 0 {
		retryAfter = time.Nanosecond
	}

	return false, retryAfter
}
