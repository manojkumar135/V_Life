"use client";

import React from "react";
import SubmitButton from "@/components/common/submitbutton";

interface ProductCardProps {
  id: number;
  name: string;
  price: number;
  image: string;
  description: string;
 onAddToCart: (product: any) => void;
  isInCart?: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({
  id,
  name,
  price,
  image,
  description,
  onAddToCart,
    isInCart = false,

}) => {
  return (
    <div className="border rounded-lg p-4 flex flex-col">
      <div className="flex items-start">
        <img
          src={image}
          alt={name}
          className="w-30 h-30 max-lg:w-15 max-lg:h-20 object-cover rounded-md mr-4"
        />
        <div className="flex-1">
          <p className="font-semibold">{name}</p>
          <p className="text-gray-600 text-sm max-md:text-xs mt-1">{description}</p>
          <p className="text-lg font-semibold mt-2 text-right">₹ {price.toFixed(2)}</p>
        </div>
      </div>

      <SubmitButton
        type="button"
        onClick={() =>
          onAddToCart({ id, name, price, image, description })
        }
        className=" text-black font-medium py-2 px-4 max-lg:px-3 max-md:text-[0.85rem] max-lg:text-[0.9rem] rounded-md self-end"
      >
        {isInCart ? "Added" : "Add to Cart"}
      </SubmitButton>
    </div>
  );
};

export default ProductCard;
