import { poolById, getPoolHourData } from './uniPoolData.mjs'
import { tokensForStrategy, liquidityForStrategy, calcFees, pivotFeeData } from './backtest.mjs'

const DateByDaysAgo = (days) => {
  const date = new Date();
  return Math.round( (date.setDate(date.getDate() - days) / 1000 ));
}

// data, pool, baseID, liquidity, unboundedLiquidity, min, max, customFeeDivisor, leverage, investment, tokenRatio
// Required = Pool ID, investmentAmount (token0 by default), minRange, maxRange, options = { days, protocol, baseToken }

export const uniswapStrategyBacktest = async ( pool, investmentAmount, minRange, maxRange, options = {}) => {
  
  const opt = {days: 30, protocol: 0, priceToken: 0, period: "hourly", ...options };

  if (pool) {
    const poolData = await poolById(pool);
    const hourlyPriceData = await getPoolHourData(pool, DateByDaysAgo(opt.days), opt.protocol);
    
    if (poolData && hourlyPriceData && hourlyPriceData.length > 0) {
      const entryPrice = opt.priceToken === 0 ? hourlyPriceData[0].close : 1 / hourlyPriceData[0].close;
      const tokens = tokensForStrategy(minRange, maxRange, investmentAmount, entryPrice, poolData.token1.decimals - poolData.token0.decimals);
      const liquidity = liquidityForStrategy(entryPrice, minRange, maxRange, tokens[0], tokens[1], poolData.token0.decimals, poolData.token1.decimals);
      const unbLiquidity = liquidityForStrategy(entryPrice, Math.pow(1.0001, -887220), Math.pow(1.0001, 887220), tokens[0], tokens[1], poolData.token0.decimals, poolData.token1.decimals);

      const hourlyBacktest = calcFees(hourlyPriceData, poolData, opt.priceToken, liquidity, unbLiquidity, investmentAmount, minRange, maxRange);
      return opt.period === 'daily' ? pivotFeeData(hourlyBacktest, opt.priceToken, investmentAmount) : hourlyBacktest;
    }

  }
}

export const hourlyPoolData = (pool, days = 30, protocol = 0) => {
  getPoolHourData(pool, DateByDaysAgo(days), protocol).then(d => {
    if ( d && d.length ) { return d }
    else { return null }
  })
}

export default uniswapStrategyBacktest