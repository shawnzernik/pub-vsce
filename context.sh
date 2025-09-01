#!/bin/bash

set -euo pipefail

OUTPUT="context.md"
IGNORED_DIRS=(.git node_modules out)
SELF_NAME=$(basename "$0")

# Use current directory if no arguments are passed
if [[ $# -eq 0 ]]; then
	PATHS=(".")
else
	PATHS=("$@")
fi

>"$OUTPUT"

log() {
	echo "$@" >&2
}

is_ignored_by_git() {
	git check-ignore -q "$1" 2>/dev/null
}

is_utf8_file() {
	file -I "$1" | grep -Eq "charset=(utf-8|us-ascii)"
}

append_to_output() {
	local path="$1"
	echo "File \`$path\`:" >>"$OUTPUT"
	echo >>"$OUTPUT"
	echo "~~~~~~" >>"$OUTPUT"
	sed "s|~~|~~~~|g" "$path" >>"$OUTPUT"
	echo >>"$OUTPUT"
	echo "~~~~~~" >>"$OUTPUT"
	echo >>"$OUTPUT"
}

process_path() {
	local base="$1"

	if [[ -d "$base" ]]; then
		find "$base" -type d \( $(printf -- "-name %s -o " "${IGNORED_DIRS[@]}" | sed 's/ -o $//') \) -prune -false -o -type f
	elif [[ -f "$base" ]]; then
		echo "$base"
	fi
}

log "Scanning paths: ${PATHS[*]}"
echo

for base in "${PATHS[@]}"; do
	while IFS= read -r file; do
		clean_path="${file#./}"
		log "Seen: $clean_path"

		case "$clean_path" in
		"$SELF_NAME")
			log "→ Skipped (self): $clean_path"
			continue
			;;
		"$OUTPUT")
			log "→ Skipped (output): $clean_path"
			continue
			;;
		esac

		if is_ignored_by_git "$clean_path"; then
			log "→ Skipped (.gitignore): $clean_path"
			continue
		fi

		if ! is_utf8_file "$file"; then
			log "→ Skipped (not UTF-8): $clean_path"
			continue
		fi

		log "→ Processed: $clean_path"
		append_to_output "$clean_path"
	done < <(process_path "$base")
done
