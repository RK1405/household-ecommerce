'use strict';
/**
 * TODO(MySQL): implement ReviewsService against the `reviews` table in db/mysql/schema.sql.
 *   npm install mysql2
 *   const pool = require('mysql2/promise').createPool({ host, user, password, database })
 *   listByProduct: SELECT ... FROM reviews WHERE product_id=? AND status='approved' ORDER BY created_at DESC
 *   create:        INSERT INTO reviews (...) VALUES (...)
 *   moderate:      UPDATE reviews SET status=? WHERE id=?
 */
const ReviewsService = require('./ReviewsService');
class MySqlReviewsAdapter extends ReviewsService {}
module.exports = MySqlReviewsAdapter;
