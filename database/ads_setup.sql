-- Run this in MySQL Workbench after selecting the darling_app schema.
-- The app also creates this table automatically when its database user has DDL privileges.
CREATE TABLE IF NOT EXISTS advertisements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  image_url LONGTEXT NOT NULL,
  target_url VARCHAR(2048) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  priority INT NOT NULL DEFAULT 0,
  starts_at DATETIME NULL,
  ends_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_advertisements_active (is_active, priority, starts_at, ends_at)
);

-- Example: replace both HTTPS links, then uncomment and run to add a real advertisement.
-- INSERT INTO advertisements (title, description, image_url, target_url, is_active, priority)
-- VALUES (
--   'Tên sản phẩm',
--   'Mô tả ngắn cho sản phẩm.',
--   'https://cdn.example.com/campaign/product.jpg',
--   'https://shop.example.com/product',
--   TRUE,
--   10
-- );

-- Stop showing an advertisement without deleting its history:
-- UPDATE advertisements SET is_active = FALSE WHERE id = 1;

-- Grant Premium only after a payment has been confirmed by a real payment provider:
-- UPDATE users SET is_premium = TRUE WHERE id = 123;
-- Revoke expired Premium access:
-- UPDATE users SET is_premium = FALSE WHERE id = 123;

-- Optional manual photo import. Prefer the app's profile editor, which maintains this table for you.
-- INSERT INTO user_images (user_id, image_url)
-- VALUES (123, 'https://cdn.example.com/profiles/user-123/photo-1.jpg'),
--        (123, 'https://cdn.example.com/profiles/user-123/photo-2.jpg');
