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

https://azure.microsoft.com/en-us/blog/fault-tolerance-in-windows-azure-sql-database/

* 3 Nodes, W2R1
* 1 Node is the Primary at all times (I think network selected)
* Uses consensus "similar to paxos" - I thin this is at te hardware level, not the nodes
** Practical experience: Something (not the secondary nodes) monitors the Primary Node to detect outages and force an election
** Maybe quorum is used for normal activities like handing off "primary" status to a secondary in order to receive updates?
* Node outages:
** Secondary nodes that are unavailable temporarily are cught up when brought back online
** Secondary nodes that are unavailable longer are replaced
** Primary node outages are detected by neighboring systems/monitoring and one of the secondaries is elected Primary
* All communications comes through a gateway that directs all traffic to the primary

Differences:
* Transaction log replication - I'm thinking about using epochs to indicate ranges of the transaction log to make this easier to manage without building real transaction logs

Dynamo
========

whitepaper link here


