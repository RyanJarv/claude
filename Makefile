.PHONY: test

test:
	node plugins/goals/tests/test-state-manager.mjs
	node plugins/goals/tests/test-goal-engine.mjs
	python3 plugins/detect-non-ascii/scripts/test-check-ascii.py
