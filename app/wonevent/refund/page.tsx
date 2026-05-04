import PolicyLayout from "../PolicyLayout";

const Refund = () => (
  <PolicyLayout title="WON EVENTS - Refund Policy">
    <p className="text-[0.7rem] lg:[0.9rem]">
      NowIT Services is committed to safeguarding user privacy on the{" "}
      <span className="font-semibold">WON Events</span> web app. This policy
      outlines how we handle data collection, usage, and security.
    </p>

    <p className="text-[0.7rem] text-black">
      <span className="text-[0.7rem] text-black font-semibold">App Name:</span>{" "}
      WON Events (Web App)
    </p>
    <p className="text-[0.7rem] text-black">
      <span className="text-[0.7rem] text-black font-semibold">Developer:</span>{" "}
      NOWIT SERVICES Pvt Ltd
    </p>
    <p className="text-[0.7rem] text-black">
      <span className="text-[0.7rem] text-black font-semibold">Document:</span>{" "}
      Refund Policy
    </p>
    <div className="w-full h-px bg-black my-1"></div>

    <ol className="w-full list-outside">
      <li className="mb-2 flex flex-col">
        <span className="font-semibold">Refund and Cancellation Policy</span>
        <span className="text-[0.7rem]">
          This Refund and Cancellation Policy outlines the terms applicable to
          subscriptions and services offered through our platform.
        </span>
      </li>

      <li className="mb-2">
        <span className="text-[0.7rem]">
          All subscriptions, service fees, or payments made for our digital
          products, including free-tier and standard offerings, are strictly
          non-refundable once the service has been activated or accessed.
        </span>
      </li>

      <li className="mb-2">
        <span className="text-[0.7rem]">
          Users may cancel their subscription at any time; however, no refunds
          will be issued for any unused portion of the subscription period.
        </span>
      </li>

      <li className="mb-2">
        <span className="text-[0.7rem]">
          For customized enterprise solutions or tailored services, refund and
          cancellation terms will be governed by the specific Service Level
          Agreement (SLA) agreed upon between the client and NOWIT SERVICES
          Pvt Ltd.
        </span>
      </li>

      <li className="mb-2">
        <span className="text-[0.7rem]">
          By using our services, you acknowledge and agree to this no-refund
          policy unless otherwise explicitly stated in a written agreement.
        </span>
      </li>

      <li className="mb-2 flex flex-col">
        <span className="font-semibold">Return Policy</span>
        <span className="text-[0.7rem]">
          We offer refund / exchange within first 2 days from the date of your
          purchase. If 2 days have passed since your purchase, you will not be
          offered a return, exchange or refund of any kind. In order to become
          eligible for a return or an exchange, (i) the purchased item should be
          unused and in the same condition as you received it, (ii) the item
          must have original packaging, (iii) if the item that you purchased on
          a sale, then the item may not be eligible for a return / exchange.
          Further, only such items are replaced by us (based on an exchange
          request), if such items are found defective or damaged.
        </span>
      </li>

      <li className="mb-2">
        <span className="text-[0.7rem]">
          You agree that there may be a certain category of products / items
          that are exempted from returns or refunds. Such categories of the
          products would be identified to you at the item of purchase. For
          exchange / return accepted request(s) (as applicable), once your
          returned product / item is received and inspected by us, we will send
          you an email to notify you about receipt of the returned / exchanged
          product. Further, if the same has been approved after the quality
          check at our end, your request (i.e. return / exchange) will be
          processed in accordance with our policies.
        </span>
      </li>

      <li className="mb-2 flex flex-col">
        <span className="font-semibold">Shipping Policy</span>
        <span className="text-[0.7rem]">
          The orders for the user are shipped through registered domestic
          courier companies and/or speed post only. Orders are shipped within 7
          days from the date of the order and/or payment or as per the delivery
          date agreed at the time of order confirmation and delivering of the
          shipment, subject to courier company / post office norms. Platform
          Owner shall not be liable for any delay in delivery by the courier
          company / postal authority. Delivery of all orders will be made to the
          address provided by the buyer at the time of purchase. Delivery of our
          services will be confirmed on your email ID as specified at the time of
          registration. If there are any shipping cost(s) levied by the seller or
          the Platform Owner (as the case be), the same is not refundable.
        </span>
      </li>
    </ol>
  </PolicyLayout>
);

export default Refund;