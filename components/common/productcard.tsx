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
  status?: "active" | "inactive";
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
  status = "active",
  onAddToCart,
  isInCart = false,
}) => {
  const router = useRouter();
  const { user } = useVLife();

  const handleEdit = (id: string | number) => {
    router.push(`/products/editproduct/${id}`);
  };

  const handleView = () => {
    if (status === "active") {
      router.push(`/products/productdetailview/${_id}`);
    }
  };

  const isDisabled = status !== "active";

  return (
    <div
      className={`border rounded-lg px-3 py-2 flex justify-between items-start 
      ${isDisabled ? "opacity-75 cursor-not-allowed" : "cursor-pointer"}
      `}
      onClick={handleView}
    >
      {/* LEFT */}
      <div className="flex flex-col justify-between items-center w-25 h-full">
        <img
          src={image}
          alt={name}
          className="w-24 h-25 object-cover rounded-md mb-2 mx-auto"
          onClick={(e) => e.stopPropagation()} // prevent card click
        />

        <div className="flex flex-row self-start justify-between items-center w-full">
          {user?.role === "admin" && (
            <TbShoppingBagEdit
              size={14}
              className="w-10 h-10 p-1 flex text-gray-800 items-center justify-center rounded-md cursor-pointer hover:bg-gray-200"
              onClick={(e) => {
                e.stopPropagation(); // 🔥 BLOCK card view
                handleEdit(_id);
              }}
            />
          )}
          <p className="text-sm mt-2">
            BV (<span className="font-semibold">{bv}</span>)
          </p>
        </div>
      </div>

      {/* RIGHT */}
      <div className="flex-1 ml-2 flex flex-col justify-between max-w-[69%] h-full">
        <div>
          <p className="font-semibold text-md capitalize">{name}</p>
          <p
            className="text-gray-600 text-sm max-md:text-xs mt-1 line-clamp-2"
            title={description}
          >
            {description}
          </p>
        </div>

        {/* Prices + cart */}
        <div className="flex flex-col items-end mt-2">
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

          <div className="flex items-center space-x-2 mt-3 justify-end">
            <SubmitButton
              type="button"
              onClick={(e) => {
                e.stopPropagation(); // 🔥 BLOCK navigation
                onAddToCart({
                  _id,
                  product_id,
                  name,
                  mrp,
                  dealer_price,
                  bv,
                  image,
                  description,
                  category,
                });
              }}
              disabled={isDisabled}
              className={`font-medium py-2 px-4 rounded-md
                ${isDisabled ? "!bg-gray-400 !cursor-not-allowed" : "cursor-pointer"}
              `}
            >
              {isDisabled ? "Unavailable" : isInCart ? "Added" : "Add to Cart"}
            </SubmitButton>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
