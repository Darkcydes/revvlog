# RevvLog

Fuel, mileage and upkeep for every vehicle in your garage, built as an offline-first
web app that installs to the home screen like a native one.

Every fill-up you log sharpens the same set of numbers: what a vehicle is actually
returning per litre, how far the tank in it will take you, what a kilometre costs,
and when the next service is due. There is no account, no server and no analytics.
Nothing leaves the phone.

---

## Getting in

A loading screen, then a four-digit PIN. There is no account behind it — the PIN is
chosen on first launch, stored as a PBKDF2 hash rather than as the digits, and
checked entirely on the phone.

Setup runs in three steps: the PIN, your first vehicle, then three slides on what
the app is for. Fingerprint unlock is offered after the PIN and is WebAuthn against
the platform authenticator, so the print itself never reaches the app — only whether
it matched. Both are changeable later under Settings → Security.

Five wrong PINs cool the keypad off for thirty seconds, doubling with each run of
five up to five minutes, and the cool-off survives a reload. The app re-locks after
sitting in the background for three minutes.

Because it is device-local there is no recovery. **Forgot your PIN?** offers to erase
the app and start over, and that is the only way past a PIN you can't remember.

---

## The garage

RevvLog is built around a garage rather than a single vehicle. A vehicle is a
motorcycle or a car, and the difference is not cosmetic — it changes the wording and
the shape of the screens:

| | Motorcycle | Car |
| --- | --- | --- |
| Tyres | Front, rear | Four corners |
| Low fuel | **Reserve** — a tap you switch to | **Low fuel at** — a lamp that comes on |
| Distance | *ridden* | *driven* |

That table lives in one object, `VEHICLE_TYPES`, rather than in scattered
`if (type === 'car')` checks, so a third type is an entry rather than a hunt.

Setup asks only what a vehicle *is* — type, brand, model, colour, and what you call
it. The numbers come later: until a tank size and an odometer reading exist, Home
shows a **Finish setting up** card where the tank gauge would be, and tapping it
opens a short guided sheet that asks for exactly those — plus, optionally, the
reserve and the service schedule. That sheet is not the vehicle's settings screen:
being asked four numbers you have never seen before wants a guided prompt, not a
list of rows meant for changing one value later. A range figure derived from a tank
size nobody entered would look measured when it was invented, so it waits.

Switch vehicles from the dropdown in the top bar. Add or remove them there, or under
Settings → Garage. Removing a vehicle takes its refuels and trips with it, and the
last vehicle can't be removed — with an empty garage there is no app left to show.

### The photo

Give a vehicle a photo and it fills the top of the home screen and its own screen,
with a dark scrim behind the text so the numbers stay readable over a white car in
daylight as much as a black one at night.

Phone photos are several megabytes and `localStorage` gives about five in total, so
the picture is downscaled to 1280px and re-encoded as JPEG before it is stored — a
2400×1600 shot lands around 90 KB. If it still won't fit, the app says so rather than
failing quietly.

---

## What it does

### Home
The screen you land on. The latest tank's mileage up top with the change against the
fill before it, full-tank range, and the effective km/l the rest of the app reasons
with. Below it the tank gauge — a ring showing how much of the current tank is left,
the distance at which you drop onto reserve, and the trip covered since the last fill.

A rail across the top filters the screen into **Overview**, **Fuel**, **Spends** and
**Distance**. The Insights block at the bottom surfaces whatever is worth knowing now.

### Refuels
Every fill-up, newest first, colour-coded against your lifetime average. Search
across stations and notes, or filter to the last three, this month, or your best
tanks. Tap a row to expand it into trip distance, price per litre, cost per kilometre
and litres, then edit or delete from there.

### Stats
Rolling average and economy score, best and worst tank, then six charts:

| Chart | Form | Shows |
| --- | --- | --- |
| Mileage per tank | Dots on tracks | Every tank against your lifetime average |
| Tank rating | Dots on tracks | Each tank scored out of 100 against your best |
| Fuel price | Min–max capsules | The price spread you paid each month |
| Cost per kilometre | Trend line | What each tank cost you to run |
| Monthly spending | Capsule columns | Money out, per month |
| Monthly distance | Capsule columns | Kilometres covered, per month |

Every point is tappable, hoverable with a mouse, and walkable with the arrow keys.

### Trips
Journeys as their own thing, separate from fill-ups. Log a route, dates, distance,
riding time and type, and it works out the fuel used, what it cost and the mileage
you got — using your actual figures where you have them and estimating from your
effective mileage and latest fuel price where you don't. Estimated values are
labelled as such rather than passed off as measured.

### Vehicle
The odometer and the upkeep around it, adapted to the type as above. Everything
optional — registration, model year, engine, fuel type, and insurance and emission
(PUC) renewal dates — sits behind a single **More details** tap, so setup can stay
short without the people who want to record the rest having nowhere to put it. The
renewal dates are shown with a live countdown ("in 24 days", "3 days overdue"), but
they are a reference, not a reminder: a device-local page cannot send a
notification, and pretending otherwise about an insurance date would be worse than
staying quiet.

### Settings
Your name, currency symbol, the garage, the PIN and fingerprint controls, and a full
export and import as a JSON file — which doubles as the backup, since the data lives
only on the device.

---

## How the numbers work

**Mileage** is measured per tank: the trip distance since the last fill divided by
the litres that went in. Lifetime average is total distance over total litres, so big
tanks weigh more than small ones, as they should.

**Effective mileage** is what the range maths runs on. It prefers your override if
you set one, then the rolling average of the last three tanks, then lifetime. Recent
riding predicts the next tank better than a lifetime figure does.

**Range and the tank gauge** follow from it — full-tank range is effective mileage
times tank size, reserve the same against your reserve litres, and the gauge is
whatever is left after the distance covered since filling up.

**Economy score** rates your recent tanks against the best you have ever managed, out
of 100. It measures you against your own vehicle and your own riding, not a
manufacturer's claim.

### Service

Service runs on **two clocks at once**, and whichever runs out first is the one that
counts:

```
distance  →  last service odometer + interval in km
time      →  last service date      + interval in months
```

That is how a schedule is actually written in a manual, and it is the honest answer
for a vehicle that has sat for eight months: its oil is due regardless of what the
odometer says. Each clock gets its own progress bar at its own percentage; the
headline reconciles them. Either can be left unset — a blank month interval means
distance only.

**Log a service** captures both halves in one sheet: when it happened, and when the
next one is due. The schedule is asked for there rather than buried in a settings
row, because an interval nobody sets is a reminder that never fires.

### The odometer

The odometer is the piece with the most care in it, because it is assembled rather
than read:

```
odometer = the reading you last typed in
         + trip distance from refuels logged since
         + distance covered since the last fill
```

Setting it by hand is a statement about the dial *right now*, so everything covered
up to that moment is already baked into the number. A fill-up or trip logged
afterwards but **dated earlier** is history being filled in — it counts towards your
mileage and cost stats, but does not move the odometer, because those kilometres are
already on it.

The refuel sheet does not leave that to guesswork. It carries an **Add this
distance to the odometer** switch that starts on the app's own reading of the dates
and says what it will do either way ("Odometer → 12,540 km" or "stays at 12,228
km"). Flip it and your choice is what gets saved on the record, so nothing
re-decides it later. Every date the app fills in for you is the *local* day, not the
UTC one — `toISOString()` rolls over early east of UTC, and without `todayLocal()` a
fill logged just after midnight in India would default to yesterday and silently be
treated as back-dated.

---

## Design

One dark theme, built on the brand's near-black with racing orange for anything that
acts. The chrome stays neutral and colour is reserved for data, one hue per metric:

| | |
| --- | --- |
| Orange `#FF5A3C` | Brand, primary actions, the tank ring |
| Green | Mileage and economy |
| Amber | Money out |
| Blue | Fuel price |
| Teal | Tank and range |
| Purple | Trips |
| Red | Service and alerts |

Spending is amber rather than orange on purpose: it used to be `#FF7A45`, a hair from
the brand, and a spend figure must not read as a primary action.

Navigation is a floating pill — Home, Stats, Trips, Vehicle, Refuels — with a
detached button that logs whatever the current screen is about. Five tabs is one more
than the pill was drawn for, so below 370px the labels drop and the icons carry it.
The vehicle tab takes the icon and the label of whatever you are looking at.

Type is [Satoshi](https://www.fontshare.com/fonts/satoshi). Charts are inline SVG in
four forms: capsule columns, dots on tracks, min–max capsules, and a trend line with
a gradient wash. Each carries a text description and a live region, so the values are
reachable without seeing them. Numbers count up on render and the tank ring animates
to its value — all of it stops if the device asks for reduced motion.

---

## Install

Open the link on your phone and add it to the home screen. It runs standalone, in
portrait, and works with no connection once loaded.

---

## Data and privacy

Everything lives in `localStorage`. Global keys hold the garage, your settings and
the lock; each vehicle's own data is namespaced by its id, so listing the garage
never drags a photo's worth of base64 along with it:

```
revv.vehicles              the garage
revv.activeVehicle         which one you are looking at
revv.settings              name, currency
revv.onboarded             whether setup has been completed
revv.lock                  PIN hash + fingerprint credential id
revv.v.<id>.entries        that vehicle's refuels
revv.v.<id>.trips          its trips
revv.v.<id>.tripSinceFill  its trip meter
revv.v.<id>.photo          its hero photo
```

If storage is unavailable the app falls back to memory for the session and says so in
Settings. Because it is device-local, **Export is the backup**. It writes a dated JSON
file containing every vehicle, its refuels, trips and photo, and Import restores it.

The lock is deliberately left out of the export: a backup is meant to travel to
another device, and neither the PIN hash nor the fingerprint credential is any use on
one. Import replaces the garage rather than merging into it — merging two sets of
vehicles silently produces duplicates you then have to unpick.

Be clear-eyed about what the PIN is: the refuels still sit unencrypted in
`localStorage`, so this is a lock on the front door rather than a safe.

---

## Built with

Plain HTML, CSS and JavaScript in a single file — no framework, no bundler, no
runtime dependencies. Charts, the sheet and modal system, the toasts, the routing,
the setup flow and the lock screen are all hand-rolled. Beyond the DOM it reaches for
`localStorage`, SubtleCrypto for the PIN hash, WebAuthn for the fingerprint, and a
canvas for downscaling photos. The only outside asset is the Satoshi typeface.

The UI is entirely SVG rather than image assets — the chart forms, the nav and
metric glyphs, and the R mark are all inline paths, so they scale, recolour and
theme for free. The only raster art is the three onboarding illustrations, which are
flat brand-palette pieces generated with an image model.

```
index.html             the entire app — markup, styles, logic
sw.js                  service worker; network-first page, cache-first assets
manifest.json          home screen install metadata
logo-mark.svg          the R mark, currentColor so one file serves every surface
logo-mark.png          the mark as exported artwork, kept as the source of truth
icon-192-v3.png        home screen icon, padded for Android's maskable crop
icon-512-v3.png        the same at full size
apple-touch-icon.png   iOS home screen
icon.svg               browser tab icon
onboarding/            mileage.png, range.png, garage.png — the three setup slides
```

Three notes for anyone editing it:

- `sw.js` caches the app shell, so bump `CACHE` when an asset in `ASSETS` changes.
  `index.html` is served network-first and no longer needs it — a stale shell was the
  one thing you couldn't refresh your way out of.
- Android caches home screen icons by filename, so changing an icon's artwork means
  changing its filename too — hence the `-v3`. Reinstalling alone is not enough.
- `logo-mark.svg` and the two inline copies in `index.html` (the boot screen and
  `LOCK_MARK`) are the same geometry. Change one, change all three.

## Running it locally

No build step, no dependencies, no package manager. Serve the folder over HTTP — the
service worker needs a real origin and won't register from `file://`:

```bash
python -m http.server 8413
```

Then open `http://localhost:8413`. Fingerprint unlock needs a secure context, so it
offers itself on `localhost` and over HTTPS, and stays out of the way on a plain-HTTP
origin — the PIN still works everywhere.
