# Change Log
All notable changes to this project will be documented in this file.
This project adheres to [Semantic Versioning](http://semver.org/).

## [1.12.3] - 2016-08-18
### Fixed
- double-check membership in reference count calculation of ifUnused delete.
  Previously, this could make it impossible to delete some points.

