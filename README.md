Link: http://tarwn.github.io/DistributedSamples/

Goal
------

The goal is to have fun and learn something by creating simulations of several types of distributed systems.

What some of the naming means:

* Network: combination of the thing that delivers messages from point A to B and any monitoring and gateway activities that occur
* Node: Individual system in the group of networked systems
* Storage: Storage that each Node independently manages, basic key/value

External Read/Write messages can be:

* directed to a single primary server by the network gateway
* (not implemented) received by any node, but forwarded to an elected primary
* (not implemented) received by any node, forwarded to the specific node for that data range
* received and processed by any node

Node Outages:

* Servers go offline but return to the network
* (not implemented) Servers go offline and are not returned to the network

Elections:

* Network elects a Primary node when communications fails (immediate)
* Network elects a Primary node when polling check detects the prior Primary is offline
* (not implemented) Node elections

Windows Azure Database
========================

Link: http://http://tarwn.github.io/DistributedSamples/Javascript/azureSql.html

https://azure.microsoft.com/en-us/blog/fault-tolerance-in-windows-azure-sql-database/

The storage part (SQL Server):
* 3 Nodes, W2R1
* 1 Node is the Primary at all times
* All incoming traffic goes to th Primary Node
* Reads are served directly from Primary
* Writes are replicated to secondary nodes, 2 node quorum required for success
* Nodes offline for a short time will attempt a lg restore and then a full restore
* (Not implemented) Nodes offline for a longer time will be replaced with a new node
* When the Primary node dies, neighbors on the network detect the outage and force the fabric to elect a new Primary

Not Implemented or Simplified:
* Fabric operations not implemented:
** Fabric logic for provisioning nodes on servers ("Paxos-like algorithm" with no details)
** Throttling
** Dead server detection and replacement
* Fabric operations simplified
** Neighbor monitoring is instead done by the generic "network" object
* Operations are kept mostly consecutive for display purposes, so little time spent ensuring the simulation handles concurrent execution well

Dynamo
========

whitepaper link here


