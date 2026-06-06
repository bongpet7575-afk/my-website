### Auction.js audit / fixes

- [x] Fix fetchAuctions() container selection to use `source` (not `currentAuctionSource`) — ✅ already done
- [x] Fix switchMarketTab('my-listings') to actually load listings (call showMyAuctions) — ✅ already done
- [x] Make switchMarketTab() update `currentAuctionSource` for auction/blackwing — ✅ already done
- [x] Harden won-item settlement query for `winner_collected` being `NULL` or `false` — ✅ already done
- [x] Re-check auction.js for syntax/merge artifacts after edits — ✅ looks clean
