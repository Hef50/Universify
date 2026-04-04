const fs = require('fs');
const path = require('path');

class LocalStorage {
  constructor() {
    this.storagePath = path.join(__dirname, '..', 'data', 'reviews.json');
    this.ensureStorageDir();
    this.reviews = this.loadReviews();
  }

  ensureStorageDir() {
    const dir = path.dirname(this.storagePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  loadReviews() {
    try {
      if (fs.existsSync(this.storagePath)) {
        const data = fs.readFileSync(this.storagePath, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading reviews:', error);
    }
    return {};
  }

  saveReviews() {
    try {
      fs.writeFileSync(this.storagePath, JSON.stringify(this.reviews, null, 2));
    } catch (error) {
      console.error('Error saving reviews:', error);
    }
  }

  getReview(channelId) {
    return this.reviews[channelId];
  }

  setReview(channelId, data) {
    this.reviews[channelId] = data;
    this.saveReviews();
  }

  deleteReview(channelId) {
    delete this.reviews[channelId];
    this.saveReviews();
  }
}

module.exports = LocalStorage;