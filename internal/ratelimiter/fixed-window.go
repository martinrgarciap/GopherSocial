package ratelimiter

import (
	"sync"
	"time"
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

func (rl *FixedWindowRateLimiter) Allow(ip string) (bool, time.Duration) {
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

func (rl *FixedWindowRateLimiter) resetCount(ip string) {
	time.Sleep(rl.window)
	rl.Lock()
	delete(rl.clients, ip)
	rl.Unlock()
}
