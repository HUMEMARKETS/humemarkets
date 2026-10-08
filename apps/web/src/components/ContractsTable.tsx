'use client';

import { cn } from '@hume/ui';
import { CONTRACTS } from '@/lib/contracts';
import { env } from '@/lib/env';
import { explorerAddressUrl } from '@/lib/explorer';
import { MONO } from '@/lib/frame';

/// Every contract of the chosen network, with its address and an explorer link. It reads the network in this
/// browser, so it follows the header's choice and is never the build network's list on another network.
export function ContractsTable() {
    return (
        <div className="overflow-x-auto rounded-panel border border-line/70 bg-surface">
            <table className="w-full min-w-[40rem] border-collapse text-sm">
                <caption className="sr-only">Every contract HUME runs on, with its address and a link to the explorer</caption>
                <thead>
                    <tr className="border-b border-line text-left text-xs text-muted">
                        <th scope="col" className="px-4 py-3 font-medium">
                            Contract
                        </th>
                        <th scope="col" className="px-4 py-3 font-medium">
                            What it does
                        </th>
                        <th scope="col" className="px-4 py-3 font-medium">
                            Address
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-line">
                    {CONTRACTS.map((contract) => {
                        const url = contract.address ? explorerAddressUrl(env.explorerUrl, contract.address) : undefined;
                        return (
                            <tr key={contract.label}>
                                <th scope="row" className="whitespace-nowrap px-4 py-3 text-left font-medium">
                                    {contract.label}
                                </th>
                                <td className="px-4 py-3 text-muted">{contract.description}</td>
                                <td className={cn(MONO, 'px-4 py-3 text-xs')}>
                                    {contract.address ? (
                                        url ? (
                                            <a
                                                href={url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="break-all underline decoration-line underline-offset-4 transition-colors duration-150 hover:text-accent-hover"
                                            >
                                                {contract.address}
                                            </a>
                                        ) : (
                                            <span className="break-all">{contract.address}</span>
                                        )
                                    ) : (
                                        <span className="text-faint">Not deployed</span>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
