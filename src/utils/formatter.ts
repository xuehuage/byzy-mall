

export const formatPriceValue = (val: string | number): number => {
    // 将金额转换成元
    return Number(val) / 100
}