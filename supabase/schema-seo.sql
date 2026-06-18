-- =============================================
-- SEO : colonnes seo_title et seo_description sur products
-- À exécuter dans Supabase SQL Editor
-- =============================================

alter table products add column if not exists seo_title       text;
alter table products add column if not exists seo_description text;
