import { roundDownToWhole } from "@/lib/domain";

export const DEFAULT_MASTER_PERCENT = 50;

/**
 * По умолчанию сумма закрытия делится 50/50 (amount_recorded = amount_full / 2),
 * но администратор может изменить процент мастера в момент закрытия.
 * amountRecorded — часть, которая идёт в кассу/аналитику/приход (доля фирмы).
 * masterEarning — доля мастера (выплачивается отдельно, в кассе не отражается как приход).
 * Округление — до целого рубля в меньшую сторону.
 */
export function splitCloseAmount(amountFull: number, masterPercent: number = DEFAULT_MASTER_PERCENT) {
  const companyPercent = 100 - masterPercent;
  const amountRecorded = roundDownToWhole((amountFull * companyPercent) / 100);
  const masterEarning = roundDownToWhole((amountFull * masterPercent) / 100);
  return { amountRecorded, masterEarning };
}
