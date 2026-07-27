# USDA is seeded locally; Open Food Facts is queried live

The two food data sources are treated in opposite ways, which is a size decision
rather than a quality one.

**USDA FoodData Central** (Foundation + SR Legacy) is about 10 MB compressed and
83 MB expanded, and shrinks to a few MB once analytical metadata is stripped to
the nutrients actually used. It is small enough to ship to the device as a
read-only SQLite file, so searching staples is instant and works with no network.

**Open Food Facts** is roughly 3.7 million products — 9 GB as CSV, 43 GB as
JSONL. Hosting and refreshing that to serve one person is indefensible, and it is
unnecessary: barcode lookup only ever needs the single product in someone's hand.
So it is queried live, by barcode and for branded text search.

Any food that is actually logged is copied into the registry permanently, so the
registry grows along the contours of what its users eat, and re-logging a regular
food never touches the network.

## Consequences

Barcode scanning requires connectivity; searching staples does not.

Neither source covers home-cooked national dishes — feijoada is not in USDA and
has no barcode. This is a known and accepted gap, and it is the reason recipe
import and user-created foods exist. They are load-bearing, not conveniences.
