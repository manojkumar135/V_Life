"use client";

import React from "react";
import SubmitButton from "@/components/common/submitbutton";

interface ProductCardProps {
  id: number;
  name: string;
  price: number;
  image: string;
  description: string;
  category: string;
  onAddToCart: (product: any) => void;
  isInCart?: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({
  id,
  name,
  price,
  image,
  description,
  category,
  onAddToCart,
  isInCart = false,
}) => {
  return (
    <div className="border rounded-lg px-4 py-2 flex flex-col justify-between">
      {/* Image + Text */}
      <div className="flex items-start">
        <img
          src={image}
          alt={name}
          className="w-30 h-30 max-lg:w-15 max-lg:h-20 object-cover rounded-md mr-4"
        />
        <div className="flex-1">
          <p className="font-semibold">{name}</p>
          <p className="text-gray-600 text-sm max-md:text-xs mt-1">
            {description}
          </p>
        </div>
      </div>

      {/* Price + Button at Bottom Right */}
      <div className="flex flex-col items-end justify-end -mt-2 xl:-mt-4 space-x-4">
        <p className="text-lg font-semibold !mr-0 mb-1">₹ {price.toFixed(2)}</p>
        <SubmitButton
          type="button"
          onClick={() =>
            onAddToCart({ id, name, price, image, description, category })
          }
          className="bg-yellow-400 hover:bg-yellow-500 text-black font-medium py-2 px-4 max-lg:px-3 max-md:text-[0.85rem] max-lg:text-[0.9rem] rounded-md"
        >
          {isInCart ? "Added" : "Add to Cart"}
        </SubmitButton>
      </div>
    </div>
  );
};

export default ProductCard;
