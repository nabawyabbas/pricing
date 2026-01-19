"use client";

import { useMemo } from "react";
import { usePageActions } from "@/components/use-page-actions";
import { getExchangeRatio, type Settings } from "@/lib/pricing";

interface ResultsActionsProps {
  settings: Settings;
}

export function ResultsActions({ settings }: ResultsActionsProps) {
  const exchangeRatio = getExchangeRatio(settings);
  const currency = exchangeRatio && exchangeRatio > 0 ? "USD" : "EGP";

  const actions = useMemo(
    () => (
      <>
        {exchangeRatio && exchangeRatio > 0 && (
          <div className="text-sm text-muted-foreground">
            Currency: {currency} (Exchange Rate: 1 USD = {exchangeRatio} EGP)
          </div>
        )}
        {(!exchangeRatio || exchangeRatio <= 0) && (
          <div className="text-sm text-muted-foreground">Currency: {currency}</div>
        )}
      </>
    ),
    [exchangeRatio, currency]
  );

  usePageActions(actions);

  return null;
}

