/** @type {import('next').NextConfig} */
module.exports = {
  experimental: {
    serverComponentsExternalPackages: ['pg', 'mongodb', 'bcryptjs', 'sharp', 'onnxruntime-node', '@xenova/transformers'],
  },
};