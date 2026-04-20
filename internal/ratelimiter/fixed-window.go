package ratelimiter

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/go-redis/redis/v8"
)

type FixedWindowRateLimiter struct {
	sync.RWMutex
	clients map[string]int
	limit   int
	window  time.Duration
}

func NewFixedWindowLimiter(limit int, window time.Duration) *FixedWindowRateLimiter {
	return &FixedWindowRateLimiter{
		clients: make(map[string]int),
		limit:   limit,
		window:  window,
	}
}

func (rl *FixedWindowRateLimiter) FixedWindowAllow(ip string) (bool, time.Duration) {
	rl.Lock()
	defer rl.Unlock()

	// count, exists := rl.clients[ip]
	// if !exists || count < rl.limit {
	// 	if !exists {
	// 		go rl.resetCount(ip)
	// 	}
	// 	rl.clients[ip]++
	// 	return true, 0
	// }

	count, exists := rl.clients[ip]
	if !exists {
		rl.clients[ip] = 1
		go rl.resetCount(ip)
		return true, 0
	}

	if count < rl.limit {
		rl.clients[ip]++
		return true, 0
	}

	return false, rl.window
}

func (rl *FixedWindowRateLimiter) FixedWindowCachedAllow(ctx context.Context, rdb *redis.Client, ip string) (bool, time.Duration, error) {
	if rdb == nil {
		return false, 0, fmt.Errorf("redis client is nil")
	}

	cacheKey := fmt.Sprintf("rate-limit-%s", ip)

	count, err := rdb.Incr(ctx, cacheKey).Result()
	if err != nil {
		return false, 0, err
	}

	if count == 1 {
		if err := rdb.Expire(ctx, cacheKey, rl.window).Err(); err != nil {
			return false, 0, err
		}
	}

	if count <= int64(rl.limit) {
		return true, 0, nil
	}

	retryAfter, err := rdb.TTL(ctx, cacheKey).Result()
	if err != nil {
		return false, 0, err
	}

	if retryAfter <= 0 {
		retryAfter = rl.window
	}

	return false, retryAfter, nil
}

func (rl *FixedWindowRateLimiter) resetCount(ip string) {
	time.Sleep(rl.window)
	rl.Lock()
	delete(rl.clients, ip)
	rl.Unlock()
}
