// auction-service.js
import { RARITY } from './game-state.js';

const AUCTION_FEE = 0.10;
const SYSTEM_ITEMS_PER_DAY = 5;

export class AuctionService {
  constructor(dbClient, state) {
    this.dbClient = dbClient;
    this.state = state;
  }

  async fetchAuctions() {
    try {
      const { data, error } = await this.dbClient
        .from('auctions')
        .select('*')
        .eq('status', 'active')
        .gt('ends_at', new Date().toISOString())
        .order('ends_at', { ascending: true });

      if (error) throw error;

      if (!data || !data.length) {
        return [];
      }

      // Fetch seller names
      const sellerIds = [...new Set(data.map(a => a.seller_id).filter(Boolean))];
      let sellerMap = {};

      if (sellerIds.length) {
        const { data: chars } = await this.dbClient
          .from('characters')
          .select('id,name')
          .in('id', sellerIds);

        if (chars) {
          chars.forEach(c => {
            sellerMap[c.id] = c.name;
          });
        }
      }

      return { auctions: data, sellerMap };
    } catch (error) {
      console.error('Fetch auctions error:', error);
      throw error;
    }
  }

  async placeBid(auctionId, currentBid, bidAmount) {
    const minBid = currentBid + Math.max(100, Math.floor(currentBid * 0.05));

    if (bidAmount < minBid) {
      throw new Error(`Minimum bid is ${minBid}g!`);
    }

    if (bidAmount > this.state.gold) {
      throw new Error('Not enough gold!');
    }

    try {
      const { data: auction } = await this.dbClient
        .from('auctions')
        .select('*')
        .eq('id', auctionId)
        .single();

      if (!auction || auction.status !== 'active') {
        throw new Error('Auction no longer active!');
      }

      // Refund previous bidder
      if (auction.current_bidder_id && auction.current_bid > 0) {
        const { data: prev } = await this.dbClient
          .from('characters')
          .select('gold')
          .eq('id', auction.current_bidder_id)
          .single();

        if (prev) {
          await this.dbClient
            .from('characters')
            .update({ gold: prev.gold + auction.current_bid })
            .eq('id', auction.current_bidder_id);
        }

        if (auction.current_bidder_id === this.state.character_id) {
          this.state.gold += auction.current_bid;
        }
      }

      this.state.gold -= bidAmount;

      await this.dbClient
        .from('auctions')
        .update({
          current_bid: bidAmount,
          current_bidder_id: this.state.character_id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', auctionId);

      return true;
    } catch (error) {
      this.state.gold += bidAmount;
      throw error;
    }
  }

  async buyoutAuction(auctionId, buyoutPrice) {
    if (buyoutPrice > this.state.gold) {
      throw new Error('Not enough gold!');
    }

    try {
      const { data: auction } = await this.dbClient
        .from('auctions')
        .select('*')
        .eq('id', auctionId)
        .single();

      if (!auction || auction.status !== 'active') {
        throw new Error('Auction no longer active!');
      }

      // Refund previous bidder
      if (auction.current_bidder_id && auction.current_bid > 0 && auction.current_bidder_id !== this.state.character_id) {
        const { data: prev } = await this.dbClient
          .from('characters')
          .select('gold')
          .eq('id', auction.current_bidder_id)
          .single();

        if (prev) {
          await this.dbClient
            .from('characters')
            .update({ gold: prev.gold + auction.current_bid })
            .eq('id', auction.current_bidder_id);
        }
      }

      this.state.gold -= buyoutPrice;

      // Pay seller
      if (auction.source === 'player' && auction.seller_id) {
        const goldAfterFee = Math.floor(buyoutPrice * (1 - AUCTION_FEE));
        const { data: sc } = await this.dbClient
          .from('characters')
          .select('gold')
          .eq('id', auction.seller_id)
          .single();

        if (sc) {
          await this.dbClient
            .from('characters')
            .update({ gold: sc.gold + goldAfterFee })
            .eq('id', auction.seller_id);
        }
      }

      // Mark as sold
      await this.dbClient
        .from('auctions')
        .update({
          status: 'sold',
          current_bidder_id: this.state.character_id,
          current_bid: buyoutPrice,
          winner_collected: true,
          seller_collected: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', auctionId);

      return true;
    } catch (error) {
      this.state.gold += buyoutPrice;
      throw error;
    }
  }

  async listItemForAuction(item, startPrice, buyoutPrice = null) {
    if (!this.state.character_id) {
      throw new Error('Must be logged in!');
    }

    if (buyoutPrice && buyoutPrice <= startPrice) {
      throw new Error('Buyout must be higher than start price!');
    }

    try {
      const endsAt = new Date();
      endsAt.setHours(endsAt.getHours() + 24);

      await this.dbClient.from('auctions').insert({
        seller_id: this.state.character_id,
        item_name: item.name,
        item_description: JSON.stringify(item),
        rarity: item.rarity || 'normal',
        start_price: startPrice,
        buyout_price: buyoutPrice || null,
        current_bid: 0,
        current_bidder_id: null,
        ends_at: endsAt.toISOString(),
        status: 'active',
        source: 'player',
        seller_collected: false,
        winner_collected: false,
      });

      return true;
    } catch (error) {
      throw error;
    }
  }

  async cancelAuction(auctionId) {
    try {
      const { data: auction } = await this.dbClient
        .from('auctions')
        .select('*')
        .eq('id', auctionId)
        .single();

      if (!auction) {
        throw new Error('Auction not found!');
      }

      // Refund bidder
      if (auction.current_bidder_id && auction.current_bid > 0) {
        const { data: bidder } = await this.dbClient
          .from('characters')
          .select('gold')
          .eq('id', auction.current_bidder_id)
          .single();

        if (bidder) {
          await this.dbClient
            .from('characters')
            .update({ gold: bidder.gold + auction.current_bid })
            .eq('id', auction.current_bidder_id);
        }

        if (auction.current_bidder_id === this.state.character_id) {
          this.state.gold += auction.current_bid;
        }
      }

      await this.dbClient
        .from('auctions')
        .update({ status: 'cancelled' })
        .eq('id', auctionId);

      return true;
    } catch (error) {
      throw error;
    }
  }
}