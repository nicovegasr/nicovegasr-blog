---
kind: 'pill'
title: 'GitOps and Argo CD'
subtitle: 'synchronize approved intent with the cluster'
icon: 'gitops'
order: 11
bonus: false
publicationDate: 2026-10-13
---

In a GitOps flow, Git holds deployment intent. CI publishes the image and
proposes a digest change in a configuration repository. A review approves
that intent. **Argo CD** watches Git and the cluster and compares desired
state with live state.

An Argo CD `Application` specifies the source repository and path, the
destination and synchronization behaviour. **Synced** means the managed
resources match the configuration interpreted from Git. **Healthy** is an
assessment of those resources' state. Neither status proves that every
business operation completes successfully.

```text
published image → digest PR → merge → Argo CD detects diff → sync
                                                    ↓
                                             live cluster state
```

## When someone changes the cluster manually

Without automatic sync, Argo CD may show `OutOfSync` and wait for action.
With `automated`, it applies changes from Git. `selfHeal` allows it to
correct certain changes made only in the cluster; `prune` allows it to
delete managed resources removed from Git. These are separate decisions.
Automatic deletion requires understanding who owns each resource and the
effect of removing it.

GitOps avoids giving every application pipeline direct cluster
credentials, but moves responsibility to repository permissions, review,
Argo CD configuration and the controller's cluster access. Platform
self-service emerges when a team can change an image or allowed settings
through a PR, with clear validation and boundaries, instead of asking
someone else to run commands manually.

Plaintext Secrets still do not belong in Git. Choose a suitable
distribution mechanism and define how credentials rotate without breaking
the application.

See the [Argo CD core concepts](https://argo-cd.readthedocs.io/en/stable/core_concepts/)
and [automated sync policy](https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/).
