#!/bin/bash

input=$(cat)

model=$(echo "$input" | grep -o '"display_name":"[^"]*"' | head -1 | sed 's/"display_name":"//;s/"//')
used=$(echo "$input" | grep -o '"used_percentage":[0-9.]*' | head -1 | sed 's/"used_percentage"://')

model=${model:-Claude}
used=${used:-0.0}

printf "%s | Context: %.1f%% used" "$model" "$used"
