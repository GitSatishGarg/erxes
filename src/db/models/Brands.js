import mongoose from 'mongoose';
import Random from 'meteor-random';

const BrandEmailConfigSchema = mongoose.Schema({
  type: {
    type: String,
    allowedValues: ['simple', 'custom'],
  },
  template: String,
});

const BrandSchema = mongoose.Schema({
  _id: {
    type: String,
    unique: true,
    default: () => Random.id(),
  },
  code: String,
  name: String,
  description: String,
  userId: String,
  createdAt: Date,
  emailConfig: BrandEmailConfigSchema,
});

class Brand {
  /**
   * Create a brand
   * @param  {Object} brandObj object
   * @return {Promise} Newly created brand object
   */
  static createBrand(brandObj, emailConfigData) {
    return this.create({
      ...brandObj,
      createdAt: new Date(),
      emailConfig: emailConfigData,
    });
  }
}

BrandSchema.loadClass(Brand);

const Brands = mongoose.model('brands', BrandSchema);

export default Brands;
