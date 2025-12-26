import mongoose from "mongoose";

const OrderItemSchema = new mongoose.Schema(
  {
    product_id: { type: String, required: true },
    product: { type: String, required: true }, // product id or code
    category: { type: String, required: true },
    name: { type: String, required: true }, // product name
    quantity: { type: Number, required: true },
    unit_price: { type: Number, required: true },
    price: { type: Number, required: true },
    mrp: { type: Number, required: true },
    dealer_price: { type: Number, required: true },
    bv: { type: Number, required: true },
    pv: { type: Number },
    gst: { type: Number },
    gst_amount: { type: Number },
    whole_gst: { type: Number },
    price_with_gst: { type: Number },
    cgst: { type: Number },
    sgst: { type: Number },
    igst: { type: Number },
    discount: { type: Number },
    hsn_code: { type: String },
    product_code: { type: String },
    created_at: { type: Date, default: Date.now },
    description: { type: String },
    image: { type: String },
    created_by: { type: String },
    last_modified_by: { type: String },
    last_modified_at: { type: Date },
  },
  { _id: false } // prevents auto _id for subdocs
);

const OrderSchema = new mongoose.Schema(
  {
    order_id: { type: String, required: true, unique: true }, // custom order ID
    user_id: { type: String, required: true }, // reference to User.user_id
    user_name: { type: String, },
    user_status: { type: String, },
    contact: { type: String, },
    mail: { type: String, },
    rank: { type: String },
    gender: { type: String },

    referBy: { type: String, },
    infinity: { type: String, },

    address: { type: String, },
    description: { type: String },

    payment_date: { type: String, required: true },
    payment: { type: String, required: true },
    payment_time: { type: String, required: true },
    payment_id: { type: String, required: true },
    payment_type: { type: String, required: true },
    amount: { type: Number, required: true }, // total order amount
    total_amount: { type: Number, },
    final_amount: { type: Number, },
    advance_deducted: { type: Number, default: 0 }, // amount deducted from advance
    is_first_order: { type: Boolean, default: false },
    reward_used: { type: Number, default: 0 },
    reward_remaining: { type: Number, default: 0 },
    payable_amount: { type: Number, },
    order_bv: { type: String, required: true }, // total BV for the order
    order_pv: { type: String, required: true },
    order_mode: { type: String, },
    total_gst: { type: Number, },
    tax: { type: Number, },

    items: [OrderItemSchema],

    created_at: { type: Date, default: Date.now },
    created_by: { type: String },
    last_modified_by: { type: String },
    last_modified_at: { type: Date },
    order_status: { type: String, default: "pending" }, // pending, paid, shipped, delivered, canceled
    bonus_checked: { type: Boolean, default: false },
    direct_bonus_checked: { type: Boolean, default: false },
matching_bonus_checked: { type: Boolean, default: false },


    // who placed / paid for the order
    placed_by: {
      user_id: { type: String },
      name: { type: String },
      contact: { type: String },
      mail: { type: String },
    },

    // who receives the order
    beneficiary: {
      user_id: { type: String },
      name: { type: String },
      contact: { type: String },
      mail: { type: String },
      address: { type: String },
    },

    // detailed reward breakdown (informational)
    reward_usage: {
      fortnight: {
        used: { type: Number, default: 0 },
        before: { type: Number, default: 0 },
        after: { type: Number, default: 0 },
      },
      cashback: {
        used: { type: Number, default: 0 },
        before: { type: Number, default: 0 },
        after: { type: Number, default: 0 },
      },
    },
  },

  {
    timestamps: false, // you’re handling custom fields
    collection: "orders",
  }
);

export const Order =
  mongoose.models.Order || mongoose.model("Order", OrderSchema);
