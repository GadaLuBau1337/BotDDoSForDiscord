package main

import (
	"fmt"
	"os"
	"strconv"
	"time"
)

func main() {
	if len(os.Args) < 4 {
		fmt.Println("Usage: http-flood.go <host> <port> <time>")
		return
	}

	host := os.Args[1]
	port := os.Args[2]
	duration, _ := strconv.Atoi(os.Args[3])

	fmt.Printf("[HTTP-FLOOD] Simulasi serangan ke %s:%s selama %d detik.\n", host, port, duration)

	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	start := time.Now()
	for range ticker.C {
		if int(time.Since(start).Seconds()) >= duration {
			break
		}
		fmt.Printf("[HTTP-FLOOD] Mengirim request ke %s:%s...\n", host, port)
	}

	fmt.Println("[HTTP-FLOOD] Serangan selesai.")
}
