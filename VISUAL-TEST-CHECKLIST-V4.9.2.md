# MORPHORA V4.9.2 Visual Test Checklist

## Homepage
- Official MORPHORA logo uses the correct dark/light asset.
- Hero reads “Explore. Learn. Understand.”
- “Enter the atlas” opens canine anatomy.
- Continue button still appears when prior study context exists.
- Species cards load correctly and remain clickable.
- Dark and light modes retain readable contrast.

## Desktop atlas (>=1180 px)
- Left atlas control dock is persistently visible.
- Gear/floating menu button is hidden at desktop width.
- Search, Labels, Reset and view buttons still function.
- Explore / Study / Quiz controls still function.
- Notes and drawing controls still function.
- Structure selection opens the right-side information inspector.
- Inspector close button works.
- Deep Zoom navigator remains usable and is not obstructed.
- Labels remain visually aligned with anchors.

## Tablet / laptop
- Below 1180 px the normal floating menu interaction returns.
- Menu can be opened and dismissed normally.
- Information panel does not cover essential controls.
- Species cards collapse to the correct column count.

## Mobile
- Header actions fit without horizontal overflow.
- Bottom atlas toolbar appears as a floating control bar.
- Structure information behaves as a bottom sheet.
- Drawing, notes, Study and Quiz remain usable.
- Safe-area insets work on devices with notches/home indicators.

## Regression
- Personal notes persist after refresh.
- Drawings persist after refresh.
- Study progress persists.
- Quiz sessions start and complete.
- Content Studio still loads and publishes normally.
- Performance Lab still records view timings.
- Service worker update does not retain stale 4.9.0/4.9.2 assets.
