# Domain handoff - anjumanearaian.org

## Safest rollout
1. Keep the current website live while the new project is tested on its `vercel.app` URL.
2. Optionally ask the domain owner to create `new.anjumanearaian.org` or `beta.anjumanearaian.org` using the CNAME target shown by Vercel.
3. After approval, add `anjumanearaian.org` and `www.anjumanearaian.org` under Vercel Project > Settings > Domains.
4. Give the domain owner the exact DNS values Vercel displays.

## Important
Do not change nameservers, MX, SPF, DKIM or DMARC records unless email migration is also intended. The existing `info@anjumanearaian.org` email can stop working if mail DNS records are removed.

Typical Vercel web records are an A record for the root domain and a CNAME for `www`, but use the exact values shown in the project's Vercel Domains screen because Vercel may provide a project-specific CNAME target.
