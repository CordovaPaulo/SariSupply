import mongoose from 'mongoose';
import { ProductStatus, ProductCategory } from '../product';

const ProductSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [100, 'Product name cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Product description is required'],
    trim: true,
    maxlength: [500, 'Product description cannot exceed 500 characters']
  },
  category: {
    type: String,
    required: [true, 'Product category is required'],
    enum: {
      values: Object.values(ProductCategory),
      message: 'Invalid product category'
    }
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0, 'Quantity cannot be negative'],
    validate: {
      validator: Number.isInteger,
      message: 'Quantity must be an integer'
    }
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  status: {
    type: String,
    required: [true, 'Product status is required'],
    enum: {
      values: Object.values(ProductStatus),
      message: 'Invalid product status'
    },
    default: ProductStatus.IN_STOCK
  },
  owner: {
    type: String,
    required: [true, 'Owner is required']
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Owner ID is required']
  },
  productImageUrl: {
    type: String,
    default: null
  }
}, {
  timestamps: true,
  collection: 'products'
});

// Indexes for better query performance
ProductSchema.index({ ownerId: 1 });
ProductSchema.index({ status: 1 });
ProductSchema.index({ category: 1 });
ProductSchema.index({ name: 'text', description: 'text' });

// Virtual for id (maps _id to id for consistency with your interfaces)
ProductSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

// Ensure virtual fields are serialized
ProductSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc: any, ret: any) {
    // Ensure id is mapped from _id
    ret.id = ret._id ? ret._id.toString() : ret.id;
    ret._id = undefined;
    ret.__v = undefined;
    return ret;
  }
});

// Pre-save middleware to auto-update status based on quantity
ProductSchema.pre('save', function(next) {
  if (this.status !== ProductStatus.DISCONTINUED) {
    if (this.quantity === 0) {
      this.status = ProductStatus.OUT_OF_STOCK;
    } else if (this.quantity > 0 && this.status === ProductStatus.OUT_OF_STOCK) {
      this.status = ProductStatus.IN_STOCK;
    }
  }
  next();
});

export default mongoose.models.Product || mongoose.model('Product', ProductSchema);