# wrangler-switch

Switch between wrangler logins without logging in again.

## Install

Needs macOS and Node 22+.

```sh
git clone https://github.com/carterwsmith/wrangler-switch.git
cd wrangler-switch
ln -s "$PWD/bin/wsw.js" ~/.local/bin/wsw
```

## Setup

```sh
wsw save personal   # save the account you're logged in as now
wsw add work        # log in to a second account and save it
```

If `wsw add` logs you in as the wrong account, log out of dash.cloudflare.com in your browser first.

## Use

```sh
wsw                 # list logins (* = active)
wsw use             # switch to the other one
wsw use personal    # switch to a specific one
```

## Don't

- Don't run `wrangler login` to add an account. Use `wsw add`.
- Don't run `wrangler logout`. It kills the saved login for good.
