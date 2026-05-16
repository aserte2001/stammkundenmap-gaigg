> ## Documentation Index
> Fetch the complete documentation index at: https://docs.worldlabs.ai/llms.txt
> Use this file to discover all available pages before exploring further.

# Pricing

> Understanding API usage and credits

## Credits

<Warning>
  World API billing is separate from Marble web app billing.

  * Credits purchased for the Marble app at [marble.worldlabs.ai](marble.worldlabs.ai) CANNOT be used with the API
  * API usage requires credits purchased through the World Labs Platform at [platform.worldlabs.ai](platform.worldlabs.ai)

  If you plan to use the API, make sure you purchase credits on the World Labs Platform, not in the Marble app.
</Warning>

The World Labs API uses a credit-based pricing model.

You may purchase credits at a fixed rate of \$1.00 USD per 1,250 credits through the [World Labs Platform](https://platform.worldlabs.ai/billing). The minimum purchase is 6,250 credits or \$5.00 USD.

API credits do not expire.

### Auto-refill

You may enable auto-refill to avoid service interruptions by automatically purchasing credits when your balance is low.

On the [billing page](https://platform.worldlabs.ai/billing), you may enable and configure auto-refill once you have a payment method on file.

You may configure the threshold at which auto-refill is triggered, as well as the target balance to refill to.

<Warning>
  Note that when auto-refill is triggered, your balance will not settle at the target balance. This is because the refill is applied before the cost of the API request is deducted from your balance.

  For example, assume your threshold is 10,000 credits and your target balance is 20,000 credits, and you have a balance of 10,000 credits.

  1. You make an API request that costs 1,500 credits. We would observe that your balance would drop to 8,500 credits, which is below your threshold.
  2. The auto-refill would then be triggered and you would be charged to bring your balance to 20,000 credits.
  3. Finally, your balance would drop to 18,500 credits to charge for the API request.
</Warning>

## Usage events

Credits are consumed as you use the API.

API requests may map to one or more usage events, and each usage event may have its own cost in credits associated with it. The total cost of an API request is the sum of the costs of all the usage events it maps to. The cost of each usage event is determined largely by the compute resources required to complete the underlying operation.

You may view your usage event history in the [usage page](https://platform.worldlabs.ai/usage).

Note that not all API requests consume credits, such as API key creation, media asset upload and management, and Operation polling.

### World generation pricing

Generating a world using the [World Generation API](/api/reference/worlds/generate) is the most common API request. However, the number of usage events and the cost of generating a world depends on the input type.

The World Generation API requires a panorama image (pano) to convert into a 3D world, so it will first generate a pano from your input if a pano is not provided. As a result, a World Generation API request often includes two usage events:

1. Pano generation (if needed)
2. World generation (from pano)

For **Marble 1.0 / `marble-1.0`** and **Marble 1.1 / `marble-1.1`**, the **world generation** usage event is billed at **1,500 credits**. Draft world generation (`marble-1.0-draft`) is billed at **150 credits**.

For **Marble 1.1 Plus / `marble-1.1-plus`**, a request always includes **1 world generation** event billed at **1,500 credits**. For larger worlds, our system may automatically determine to include up to 1,500 additional credits for variable world generation.

Depending on your input type, you may also incur a **pano generation** usage event. If you generate from an existing pano, there is no pano generation step, so there is no additional pano generation cost.

#### Usage event costs

| Usage event                       | Credits |
| --------------------------------- | ------: |
| Pano generation (image, pano)     |       0 |
| Pano generation (text)            |      80 |
| Pano generation (image, non-pano) |      80 |
| Pano generation (multi-image)     |     100 |
| Pano generation (video)           |     100 |
| Draft world generation            |     150 |
| World generation                  |   1,500 |

#### Draft model totals (`marble-1.0-draft`)

| Input type       | Pano generation | World generation | Total |
| ---------------- | --------------: | ---------------: | ----: |
| Image (pano)     |               0 |              150 |   150 |
| Text             |              80 |              150 |   230 |
| Image (non-pano) |              80 |              150 |   230 |
| Multi-image      |             100 |              150 |   250 |
| Video            |             100 |              150 |   250 |

#### Standard model totals (`marble-1.0`, `marble-1.1`)

| Input type       | Pano generation | World generation | Total |
| ---------------- | --------------: | ---------------: | ----: |
| Image (pano)     |               0 |            1,500 | 1,500 |
| Text             |              80 |            1,500 | 1,580 |
| Image (non-pano) |              80 |            1,500 | 1,580 |
| Multi-image      |             100 |            1,500 | 1,600 |
| Video            |             100 |            1,500 | 1,600 |

#### Marble 1.1 Plus totals (`marble-1.1-plus`)

| Input type       | Pano generation | Base world generation | Variable world generation | Total       |
| ---------------- | --------------: | --------------------: | ------------------------- | ----------- |
| Image (pano)     |               0 |                 1,500 | 0-1,500                   | 1,500-3,000 |
| Text             |              80 |                 1,500 | 0-1,500                   | 1,580-3,080 |
| Image (non-pano) |              80 |                 1,500 | 0-1,500                   | 1,580-3,080 |
| Multi-image      |             100 |                 1,500 | 0-1,500                   | 1,600-3,100 |
| Video            |             100 |                 1,500 | 0-1,500                   | 1,600-3,100 |
