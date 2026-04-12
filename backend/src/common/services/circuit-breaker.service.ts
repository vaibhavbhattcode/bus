import { Injectable, Logger } from '@nestjs/common';

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

interface CircuitConfig {
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
  resetTimeout: number;
}

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private circuits = new Map<string, {
    state: CircuitState;
    failures: number;
    successes: number;
    nextAttempt: number;
    config: CircuitConfig;
  }>();

  private readonly defaultConfig: CircuitConfig = {
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 60000,
    resetTimeout: 30000,
  };

  async execute<T>(
    name: string,
    fn: () => Promise<T>,
    config?: Partial<CircuitConfig>,
  ): Promise<T> {
    const circuit = this.getOrCreateCircuit(name, config);

    if (circuit.state === CircuitState.OPEN) {
      if (Date.now() < circuit.nextAttempt) {
        throw new Error(`Circuit breaker ${name} is OPEN`);
      }
      circuit.state = CircuitState.HALF_OPEN;
      circuit.successes = 0;
      this.logger.warn(`Circuit ${name} entering HALF_OPEN state`);
    }

    try {
      const result = await Promise.race([
        fn(),
        this.timeout(circuit.config.timeout),
      ]);

      this.onSuccess(name);
      return result as T;
    } catch (error) {
      this.onFailure(name);
      throw error;
    }
  }

  private getOrCreateCircuit(name: string, config?: Partial<CircuitConfig>) {
    if (!this.circuits.has(name)) {
      this.circuits.set(name, {
        state: CircuitState.CLOSED,
        failures: 0,
        successes: 0,
        nextAttempt: 0,
        config: { ...this.defaultConfig, ...config },
      });
    }
    return this.circuits.get(name)!;
  }

  private onSuccess(name: string) {
    const circuit = this.circuits.get(name)!;
    circuit.failures = 0;

    if (circuit.state === CircuitState.HALF_OPEN) {
      circuit.successes++;
      if (circuit.successes >= circuit.config.successThreshold) {
        circuit.state = CircuitState.CLOSED;
        circuit.successes = 0;
        this.logger.log(`Circuit ${name} closed after successful recovery`);
      }
    }
  }

  private onFailure(name: string) {
    const circuit = this.circuits.get(name)!;
    circuit.failures++;
    circuit.successes = 0;

    if (circuit.failures >= circuit.config.failureThreshold) {
      circuit.state = CircuitState.OPEN;
      circuit.nextAttempt = Date.now() + circuit.config.resetTimeout;
      this.logger.error(`Circuit ${name} opened after ${circuit.failures} failures`);
    }
  }

  private timeout(ms: number): Promise<never> {
    return new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Circuit breaker timeout')), ms),
    );
  }

  getState(name: string): CircuitState {
    return this.circuits.get(name)?.state || CircuitState.CLOSED;
  }

  reset(name: string) {
    this.circuits.delete(name);
  }
}
