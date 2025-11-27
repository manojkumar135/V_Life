"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Layout from "@/layout/Layout";
import axios from "axios";
import Loader from "@/components/common/loader";
import ShowToast from "@/components/common/Toast/toast";
import { IoIosArrowBack } from "react-icons/io";
import { HiShoppingCart } from "react-icons/hi";
import { useVLife } from "@/store/context";

interface ProductType {
  product_id: string;
  name: string;
  description: string;
  mrp: number;
  dealer_price: number;
  bv: number;
  pv: number;
  hsn_code: string;
  gst: number;
  cgst: number;
  sgst: number;
  igst: number;
  discount: number;
  product_code: string;
  category: string;
  status: string;
  image: string;
}

export default function ProductViewPage() {
  const router = useRouter();
  const { user } = useVLife();
  const { id: productId } = useParams();

  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState<ProductType | null>(null);

  useEffect(() => {
    if (!productId) return;
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const { data } = await axios.get(
          `/api/product-operations?product_id=${productId}`
        );
        if (data?.data) setProduct(data.data);
        else ShowToast.error("Product not found");
      } catch {
        ShowToast.error("Failed to fetch product");
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [productId]);

  const goBack = () => router.push("/orders/addorder");

  if (!product || loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-[80vh]">
          <Loader />
        </div>
      </Layout>
    );
  }

  // 🔥 GST applies to dealer price only
  const totalGST = product.gst + product.cgst + product.sgst + product.igst;

  const gstValue = (product.dealer_price * totalGST) / 100;
  const finalPrice = product.dealer_price + gstValue;

  return (
    <Layout>
      {/* Header */}
      <div className="flex items-center px-4 md:px-10 mt-4 mb-6">
        <IoIosArrowBack
          size={25}
          className="cursor-pointer mr-3"
          onClick={goBack}
        />
        <h2 className="text-xl font-semibold">Product Details</h2>
      </div>

      <div className="px-4 md:px-10 pb-10">
        <div className="bg-white rounded-2xl p-0 max-w-5xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-12">
            {/* IMAGE */}
            <div className="lg:w-2/5 w-full flex items-start justify-start">
              <img
                src={product.image}
                alt={product.name}
                className="w-full max-w-[400px] object-contain rounded-lg"
              />
            </div>

            {/* DETAILS */}
            <div className="lg:w-3/5 w-full">
              <h1 className="max-lg:text-xl text-3xl font-bold capitalize text-gray-800">
                {product.name}
              </h1>

              <p className="text-gray-600 text-base mt-3">
                {product.description || "No Description"}
              </p>

              <div className="mt-6 space-y-4 text-gray-700">
                <Item label="Category" value={product.category} />
                <Item label="Product Code" value={product.product_code} />
                <Item label="HSN Code" value={product.hsn_code} />
                <Item label="Business Volume (BV)" value={product.bv} />
                <Item label="Purchase Volume (PV)" value={product.pv} />

                {/* PRICE */}
                <div className="border-t pt-5">
                  <p className="text-lg font-semibold mb-1 text-gray-900">
                    Price
                  </p>

                  <p className="max-lg:text-xl text-2xl font-bold text-blue-600">
                    ₹{finalPrice.toFixed(2)}
                  </p>

                  <p className="text-xs text-gray-500 mt-1">
                    Base Dealer Price: ₹{product.dealer_price} + GST {totalGST}%
                    = ₹{gstValue.toFixed(2)}
                  </p>
                </div>

                {/* STATUS ONLY FOR ADMIN */}
                {user.role === "admin" && (
                  <div className="flex justify-between border-t pt-4">
                    <p className="text-lg font-semibold">Status</p>
                    <span
                      className={`px-3 py-1 rounded text-white text-sm capitalize ${
                        product.status === "active"
                          ? "bg-green-600"
                          : "bg-gray-500"
                      }`}
                    >
                      {product.status}
                    </span>
                  </div>
                )}
              </div>

              <button className="mt-6 w-full bg-[#106187] text-white py-3 rounded-xl text-lg flex items-center justify-center gap-2 hover:bg-blue-700">
                <HiShoppingCart size={25} /> Add to Cart
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function Item({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between text-sm md:text-base">
      <span className="font-semibold text-gray-700">{label}</span>
      <span className="text-gray-600">{value || "-"}</span>
    </div>
  );
}
