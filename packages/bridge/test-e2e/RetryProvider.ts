import { providers, utils } from 'ethers'
function delay(time: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, time))
}

/**
 * Custom ethers.js provider automatically retrying any errors coming from node
 */
export class RetryProvider extends providers.JsonRpcProvider {
  public maxAttempts: number

  constructor(attempts: number, url?: utils.ConnectionInfo | string, network?: string) {
    super(url, network)
    this.maxAttempts = attempts
  }

  public async perform(method: string, params: any): Promise<any> {
    let attempt = 0

    return utils.poll(async () => {
      attempt++

      try {
        return await super.perform(method, params)
      } catch (error: any) {
        console.log(
          `Got ${error.statusCode}, ${JSON.stringify({
            attempts: attempt,
            method,
            params,
            error,
          })}`,
        )

        await this.handleError(attempt, error, method)
      }
    })
  }

  private async handleError(attempt: number, error: any, method: string): Promise<void> {
    // do not retry sendTransaction calls
    if (attempt >= this.maxAttempts || method === 'sendTransaction') {
      console.log('Got error, failing...', JSON.stringify(error))
      throw error
    } else if (error && error.statusCode) {
      // if we are hitting the api limit retry faster
      console.log('Retrying 429...')
      await delay(500)
    } else {
      // just retry if error is not critical
      console.log('Retrying...')
      await delay(1000)
    }
  }
}
