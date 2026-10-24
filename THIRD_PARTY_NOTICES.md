# Third-party notices and asset provenance

The root MIT license applies to original TrulyGo OSS code and documentation.
It does not replace dependency licenses or grant trademark rights. The
repository distributes source and a lockfile, not a vendored dependency tree
or prebuilt native binaries.

## Dependency licenses

`package-lock.json` records the exact dependency versions. `npm run licenses`
checks the installed tree's license metadata. License metadata is a screening
step, not a replacement for reading the notices and terms in packages that
are redistributed. Preserve their copyright and license notices in any
source or binary distribution, including fonts and native libraries.

The dependency tree includes permissive licenses such as MIT, ISC, BSD,
Apache-2.0, CC0-1.0, and BlueOak-1.0.0. Components with additional conditions
include:

| Component | License / redistribution note |
| --- | --- |
| Geist font files | SIL Open Font License 1.1; retain the shipped font license and observe its name conditions |
| Lightning CSS and axe-core | MPL-2.0; retain notices and satisfy applicable source-availability requirements for covered files |
| sharp / libvips | sharp is Apache-2.0; distributed libvips/native components carry their own licenses, including LGPL-3.0-or-later |
| JSZip | Dual MIT OR GPL-3.0-or-later; this project's use relies on the MIT option |

Check the actual installed versions and all bundled components before shipping
an application image, archive, or binary. In particular, consult
[sharp's licensing guidance](https://sharp.pixelplumbing.com/install/#licensing)
and the notices shipped with the selected native artifacts. Do not assume
that an npm package's top-level license covers everything inside it.

The former transitive `buffers@0.1.1` dependency lacked declared package
license metadata. The current dependency update removes it; do not reintroduce
it without resolving its licensing.

## Omitted third-party logos

Nineteen third-party PNG logo files had no documented redistribution source
or permission in the available project material. They are excluded from this
edition, including its initial Git history, and neutral interface elements
replace their use. No redistribution permission is inferred from an existing
file or the addition of an MIT license.

| Former asset group | Brands represented |
| --- | --- |
| Marketplace logos (8) | Amazon, Ciceksepeti, Hepsiburada, Idefix, n11, Pazarama, PttAVM, Trendyol |
| Social logos (11) | Discord, Facebook, Instagram, Kick, LinkedIn, Telegram, TikTok, Twitch, WhatsApp, X, YouTube |

Platform names may identify supported link destinations. They remain their
owners' trademarks; no affiliation, sponsorship, or endorsement is implied.
The code license grants no right to impersonate those services or any hosted
TrulyGo service. An independent operator should review their own branding.

## New neutral artwork

The legacy application marks have also been replaced. The link-shaped SVG
in `public/brand/trulygo-mark.svg` and `src/app/icon.svg`, its PNG/ICO icon
derivatives, and the report marks were authored for this edition from simple
geometric link shapes. This original artwork is provided under the root MIT
license. The word TrulyGo identifies the project; no trademark rights are
granted by that code/artwork license. Third-party platform logos are not used
as inputs to these replacements.

## Adding assets or dependencies

Record the upstream source, author/rightsholder, exact license, required
attribution, and any permitted-use restrictions for new assets. Preserve
original notices. If redistribution permission cannot be established, omit
the material or replace it with an original neutral component.
