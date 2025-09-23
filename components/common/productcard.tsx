"use client";

import React from "react";
import SubmitButton from "@/components/common/submitbutton";
import { TbShoppingBagEdit } from "react-icons/tb";
import { useRouter } from "next/navigation";
import { useVLife } from "@/store/context";

interface ProductCardProps {
  _id: string;
  product_id: string | number;
  name: string;
  mrp?: number;
  dealer_price?: number;
  bv?: number;
  image?: string;
  description?: string;
  category?: string;
  onAddToCart: (product: any) => void;
  isInCart?: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({
  _id,
  product_id,
  name,
  mrp = 0,
  dealer_price = 0,
  bv = 0,
  image = "/placeholder.png",
  description = "",
  category = "",
  onAddToCart,
  isInCart = false,
}) => {
  const router = useRouter();

  const { user } = useVLife();

  const handleEdit = (_id: string | number) => {
    router.push(`/products/editproduct/${_id}`);
  };

  return (
    <div className="border rounded-lg px-4 py-2 flex justify-between items-start">
      {/* Left side: Image + BV */}
      <div className="flex flex-col justify-between items-center w-25 h-full">
        <img
          src={image}
          alt={name}
          className="w-24 h-25 object-cover rounded-md mb-2"
        />
        <p className="text-sm mt-2">
          BV (<span className="font-semibold">{bv.toFixed(2)}</span>)
        </p>
      </div>

      {/* Right side: Name + Description + Price Info + Add to Cart + Edit */}
      <div className="flex-1 ml-2 flex flex-col justify-between max-w-[69%]">
        <div>
          <p className="font-semibold text-md">{name}</p>
          <p
            className="text-gray-600 text-sm max-md:text-xs mt-1 line-clamp-2"
            title={description}
          >
            {description}
          </p>

          <div className="flex flex-col items-end mt-2">
            {/* Price */}
            <div className="text-right">
              <p className="text-sm text-gray-500">
                MRP: <span className="line-through">₹ {mrp.toFixed(2)}</span>
              </p>
              <p className="text-sm font-semibold">
                Deal Price:{" "}
                <span className="text-md font-bold">
                  ₹ {dealer_price.toFixed(2)}
                </span>
              </p>
            </div>

            {/* Buttons aligned to right */}
            <div className="flex items-center space-x-2 mt-3 justify-end">
              {/* Show edit icon only for user (or change to admin if needed) */}
              {user?.role === "user" && (
                <TbShoppingBagEdit
                  size={14}
                  className="w-10 h-10 p-1 flex items-center justify-center rounded-md cursor-pointer hover:bg-gray-200"
                  onClick={() => handleEdit(_id)}
                />
              )}

              {/* Add to Cart button */}
              <SubmitButton
                type="button"
                onClick={() =>
                  onAddToCart({
                    product_id,
                    name,
                    mrp,
                    dealer_price,
                    bv,
                    image,
                    description,
                    category,
                  })
                }
                className="bg-yellow-400 hover:bg-yellow-500 text-black font-medium py-2 px-4 max-lg:px-3 max-md:text-[0.85rem] max-lg:text-[0.9rem] rounded-md"
              >
                {isInCart ? "Added" : "Add to Cart"}
              </SubmitButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
