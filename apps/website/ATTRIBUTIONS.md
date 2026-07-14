This Figma Make file includes components from [shadcn/ui](https://ui.shadcn.com/) used under [MIT license](https://github.com/shadcn-ui/ui/blob/main/LICENSE.md).

This Figma Make file includes photos from [Unsplash](https://unsplash.com) used under [license](https://unsplash.com/license).

## Photography

**TODO (client content): every photo below is a placeholder.** Replace with real,
licensed photography of the collection before launch, and delete this section's
rows as you go.

All photos are downloaded and **self-hosted** in `src/assets/` — none are
hot-linked — and are used under the [Unsplash licence](https://unsplash.com/license).

| Asset | Used by | Photographer | Source |
| --- | --- | --- | --- |
| `hero.jpg` | Landing hero | *not recorded* | Unsplash (predates the attribution table; re-source or replace before launch) |
| `statement.jpg` | "Shown to a single owner at a time." band | *not recorded* | Unsplash (as above) |
| `ethos.jpg` | 01 · How we work — the detail bleeding in at the right edge | Nischal Kanishk | https://unsplash.com/photos/TQT8Qu4UvS8 |
| `featured.jpg` | 02 · Currently available — the showroom behind the card plate | Mehdi El marouazi | https://unsplash.com/photos/JRsiRBRBfEw |
| `process.jpg` | 03 · The process — the detail plate | ObjectType RAW | https://unsplash.com/photos/xORUjDDnoAI |
| `house.jpg` | 04 · The house — the coupé at the section's foot | Noel Wangler | https://unsplash.com/photos/vH_K5O-nhYw |

`featured.jpg` is not the original frame. It is de-saturated (the palette is
monochrome; the source carries a warm cast off the showroom ceiling),
Gaussian-blurred at 13px and given back ~12% contrast, all **before** being
committed. Baking the defocus in keeps a full-bleed `blur()` filter off the main
thread, and the blur is a property of this asset rather than a theme decision.
Re-derive it from the source above if it ever needs regenerating.
