> ## Documentation Index
> Fetch the complete documentation index at: https://docs.worldlabs.ai/llms.txt
> Use this file to discover all available pages before exploring further.

# Models

> How Marble model names map to World API model parameters

## Model mapping

The World API currently supports the following Marble models:

| Marble model       | API `model`        |
| ------------------ | ------------------ |
| `Marble 1.1 Plus`  | `marble-1.1-plus`  |
| `Marble 1.1`       | `marble-1.1`       |
| `Marble 1.0`       | `marble-1.0`       |
| `Marble 1.0 Draft` | `marble-1.0-draft` |

<Warning>
  The API still supports the legacy `model` value for Marble 1.0 models. Support for these legacy values will be removed in a future release.

  | Current `model` value | Legacy `model` value |
  | --------------------- | -------------------- |
  | `marble-1.0`          | `Marble 0.1-plus`    |
  | `marble-1.0-draft`    | `Marble 0.1-mini`    |
</Warning>

<Warning>
  The API currently supports a default model of `marble-1.0` if no model is specified in order to maintain compability. This will change in a future release to default to `marble-1.1`.
</Warning>
