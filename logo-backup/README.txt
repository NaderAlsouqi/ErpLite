OLD SKYLINE LOGO — backup (pre-2026-06 logo replacement)
=========================================================
These are the original brand-logo image files, replaced when the new
Skyline logo was applied. They are kept OUTSIDE src/assets so they are
NOT bundled into the build.

To restore the OLD logo:
1. Sidebar + Login used an inline SVG (NOT these files). To bring it back,
   open and follow the "OLD LOGO — to restore" comment blocks in:
     - src/app/shared/common/sidebar/sidebar.component.html
     - src/app/authentication/login/login.component.html
   (delete the <img> line, uncomment the <svg> block).
2. To restore these image files, copy them back into
   src/assets/images/brand-logos/ (overwriting the new ones).
