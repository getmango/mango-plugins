# Manganato Plugin

This is the Mango plugin for [Manganato](https://manganato.com/). 

Note that

- All downloaded chapters will be placed in their respective series folder in your library.
- Cloudflare rate limits extensive downloads. Adjust `wait_seconds` in `info.json` if you plan to download many chapters in one go (or chapters with many pages).
- Manganelo seems to have changed name to Manganato.
- Currently page count isn't supplied on the chapter list so gathering page count would require multiple calls and is expensive (code commented out).

Updated by [@MattTheHuman](https://github.com/MattTheHuman).

Thanks to [@TheBritishAccent](https://github.com/TheBritishAccent) for the base ideas.

Thanks to Alex Ling for the MangaDex v2 code as inspiration.
