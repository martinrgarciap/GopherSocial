package ratelimiter

import (
	"testing"
	"time"
)

func TestFixedWindowRateLimiter(t *testing.T) {
	limit := 3
	window := 20 * time.Millisecond
	limiter := NewFixedWindowLimiter(limit, window)

	firstIP := "192.168.1.1"
	secondIP := "192.168.1.2"

	// Should allow the first IP up to the limit inside the current window.
	for i := 0; i < limit; i++ {
		allowed, retryAfter := limiter.FixedWindowAllow(firstIP)
		if !allowed {
			t.Errorf("Expected request %d to be allowed, retry after was %s", i+1, retryAfter)
		}
	}

	// Next request from the same IP should be denied because the window is full.
	allowed, retryAfter := limiter.FixedWindowAllow(firstIP)
	if allowed {
		t.Error("Expected request to be denied after fixed window limit was reached")
	}
	if retryAfter != window {
		t.Errorf("Expected retryAfter to be %s, got %s", window, retryAfter)
	}

	// A different IP should have its own counter and still be allowed.
	allowed, retryAfter = limiter.FixedWindowAllow(secondIP)
	if !allowed {
		t.Errorf("Expected different IP to be allowed, retry after was %s", retryAfter)
	}

	// Wait for the first IP's window to reset.
	time.Sleep(window + 10*time.Millisecond)

	allowed, retryAfter = limiter.FixedWindowAllow(firstIP)
	if !allowed {
		t.Errorf("Expected request to be allowed after the window reset, retry after was %s", retryAfter)
	}
}

func TestTokenBucketRateLimiter(t *testing.T) {
	rate := 1.0
	capacity := 3.0
	mockTimeProvider := &MockTimeProvider{currentTime: time.Now().UTC()}
	limiter := NewTokenBucketLimiter(rate, capacity, mockTimeProvider)

	firstIP := "192.168.1.10"
	secondIP := "192.168.1.11"

	// Should allow the first IP up to capacity in quick succession.
	for i := 0; i < int(capacity); i++ {
		allowed, retryAfter := limiter.TokenBucketAllow(firstIP)
		if !allowed {
			t.Errorf("Expected request %d to be allowed, retry after was %s", i+1, retryAfter)
		}
	}

	// Next request from the same IP should be denied because the bucket is empty.
	allowed, retryAfter := limiter.TokenBucketAllow(firstIP)
	if allowed {
		t.Error("Expected request to be denied after token capacity was reached")
	}
	if retryAfter <= 0 {
		t.Error("Expected retryAfter to be greater than zero")
	}

	// A different IP should have its own bucket and still be allowed.
	allowed, retryAfter = limiter.TokenBucketAllow(secondIP)
	if !allowed {
		t.Errorf("Expected different IP to be allowed, retry after was %s", retryAfter)
	}

	// Waiting for 2 seconds should refill 2 tokens for the first IP.
	mockTimeProvider.Advance(2 * time.Second)

	for i := 0; i < 2; i++ {
		allowed, retryAfter = limiter.TokenBucketAllow(firstIP)
		if !allowed {
			t.Errorf("Expected request %d after refill to be allowed, retry after was %s", i+1, retryAfter)
		}
	}

	// The first IP should be empty again after consuming the refilled tokens.
	allowed, retryAfter = limiter.TokenBucketAllow(firstIP)
	if allowed {
		t.Error("Expected request to be denied after consuming refilled tokens")
	}
	if retryAfter <= 0 {
		t.Error("Expected retryAfter to be greater than zero after consuming refilled tokens")
	}
}

func TestLeakyBucketRateLimiter(t *testing.T) {
	rate := 1.0
	capacity := 3.0
	mockTimeProvider := &MockTimeProvider{currentTime: time.Now().UTC()}
	limiter := NewLeakyBucketLimiter(rate, capacity, mockTimeProvider)

	firstIP := "192.168.1.20"
	secondIP := "192.168.1.21"

	// Should allow the first IP to fill the bucket to capacity.
	for i := 0; i < int(capacity); i++ {
		allowed, retryAfter := limiter.LeakyBucketAllow(firstIP)
		if !allowed {
			t.Errorf("Expected request %d to be allowed, retry after was %s", i+1, retryAfter)
		}
	}

	// Next request from the same IP should be denied because the bucket is full.
	allowed, retryAfter := limiter.LeakyBucketAllow(firstIP)
	if allowed {
		t.Error("Expected request to be denied after leaky bucket capacity was reached")
	}
	if retryAfter <= 0 {
		t.Error("Expected retryAfter to be greater than zero")
	}

	// A different IP should have its own bucket and still be allowed.
	allowed, retryAfter = limiter.LeakyBucketAllow(secondIP)
	if !allowed {
		t.Errorf("Expected different IP to be allowed, retry after was %s", retryAfter)
	}

	// Waiting for 2 seconds should leak 2 units of water from the first IP's bucket.
	mockTimeProvider.Advance(2 * time.Second)

	for i := 0; i < 2; i++ {
		allowed, retryAfter = limiter.LeakyBucketAllow(firstIP)
		if !allowed {
			t.Errorf("Expected request %d after leaking to be allowed, retry after was %s", i+1, retryAfter)
		}
	}

	// The first IP should be full again after adding those 2 requests.
	allowed, retryAfter = limiter.LeakyBucketAllow(firstIP)
	if allowed {
		t.Error("Expected request to be denied after bucket filled again")
	}
	if retryAfter <= 0 {
		t.Error("Expected retryAfter to be greater than zero after bucket filled again")
	}
}

func TestSlidingWindowCounterRateLimiter(t *testing.T) {
	rate := 5.0
	interval := 1 * time.Minute
	mockTimeProvider := &MockTimeProvider{currentTime: time.Now().UTC()}
	limiter := NewSlidingWindowCounterLimiter(rate, interval, mockTimeProvider)

	firstIP := "192.168.1.30"
	secondIP := "192.168.1.31"

	// Should allow the first IP up to the rate inside the first window.
	for i := 0; i < int(rate); i++ {
		allowed, retryAfter := limiter.SlidingWindowAllow(firstIP)
		if !allowed {
			t.Errorf("Expected request %d to be allowed, retry after was %s", i+1, retryAfter)
		}
	}

	// Next request from the same IP should be denied.
	allowed, retryAfter := limiter.SlidingWindowAllow(firstIP)
	if allowed {
		t.Error("Expected request to be denied after sliding window rate was reached")
	}
	if retryAfter <= 0 {
		t.Error("Expected retryAfter to be greater than zero")
	}

	// A different IP should have its own counter and still be allowed.
	allowed, retryAfter = limiter.SlidingWindowAllow(secondIP)
	if !allowed {
		t.Errorf("Expected different IP to be allowed, retry after was %s", retryAfter)
	}

	// Move one full window plus half a window forward.
	// The previous window still counts, but only with half its original weight.
	mockTimeProvider.Advance(90 * time.Second)

	for i := 0; i < 3; i++ {
		allowed, retryAfter = limiter.SlidingWindowAllow(firstIP)
		if !allowed {
			t.Errorf("Expected request %d after sliding forward to be allowed, retry after was %s", i+1, retryAfter)
		}
	}

	// After those requests, the weighted count should be over the limit again.
	allowed, retryAfter = limiter.SlidingWindowAllow(firstIP)
	if allowed {
		t.Error("Expected request to be denied after weighted count reached the limit")
	}
	if retryAfter <= 0 {
		t.Error("Expected retryAfter to be greater than zero after weighted count reached the limit")
	}
}
