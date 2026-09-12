# Your personal site

Three files, no build step needed: `index.html`, `style.css`, `script.js`.

## Make it yours

Open `index.html` and replace:
- `Your Name` (appears twice: page title + hero heading)
- the hero lede paragraph, the `hero-tags` list
- the three `Project one/two/three` cards — title, description, and the `#` links
- the `Right now` list
- the email and social links in the `Say hi` section

Colors and fonts live at the top of `style.css` under `:root` if you want to
tweak the palette.

## Receive contact form messages

The contact form uses FormSubmit to deliver messages to `tejveer603s@gmail.com`.
After deploying the site, submit the form once and click the activation link in
the email FormSubmit sends you. Later submissions will arrive in your inbox.

This is email delivery rather than a live chat. For an actual real-time chat
window, add a service such as Tawk.to or Crisp.

## Deploy with GitHub Pages (free)

1. Create a new **public** GitHub repo (e.g. `my-website`).
2. Upload these three files (`index.html`, `style.css`, `script.js`) to the
   root of the repo — don't put them in a subfolder.
3. In the repo, go to **Settings → Pages**.
4. Under "Build and deployment", choose **Deploy from a branch**, pick
   `main`, folder `/root`, then **Save**.
5. Wait ~1–2 minutes, refresh the Pages settings tab, and you'll see your
   live URL (something like `https://yourusername.github.io/my-website`).
