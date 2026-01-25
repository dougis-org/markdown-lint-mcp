<!-- TOGGLE: Set REQUIRE_SIGNED_COMMITS to true to enable signed commits, false to disable -->
<!-- REQUIRE_SIGNED_COMMITS: true -->

{% if REQUIRE_SIGNED_COMMITS == true %}
## Signed Commits

All commits must be GPG/SSH signed. Use the `-S` flag:

```
git commit -S -m "<type>(<scope>): #<ISSUE_NUMBER> <imperative summary>"
```

Example:
```
git commit -S -m "feat(api): #214 add payload eviction endpoint"
```

Ensure your Git config is set up for commit signing:
```
git config user.signingkey <KEY_ID>
git config commit.gpgsign true
```

{% else %}
<!-- Signed commits requirement is disabled -->
{% endif %}
