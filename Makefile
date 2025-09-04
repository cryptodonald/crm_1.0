.PHONY: docs check-docs
docs:
	node scripts/generate-docs.mjs
check-docs:
	node scripts/generate-docs.mjs
	git diff --exit-code README.md WARP.md
