---
kind: 'pill'
title: 'Single Responsibility Principle (SRP)'
subtitle: 'Split by reasons to change, not by steps'
icon: 'responsibility'
order: 2
momentStage: 'srp'
publicationDate: 2026-10-12
---

The Single Responsibility Principle (SRP) suggests keeping together code that changes for the same [reason](https://blog.cleancoder.com/uncle-bob/2014/05/08/SingleReponsibilityPrinciple.html) and separating code that changes for different ones. Counting methods or steps doesn't reveal that boundary.

## Month 8: a new rule for every supplier

Each importer reader translates its supplier's JSON and, along the way, checks that the record is valid: a code is present and the quantity isn't negative. That works until the business decides product codes must be eight characters long. Every reader has to change. One gets missed, and that supplier's six-character codes keep coming in.

The readers change for two reasons: when a supplier changes its format, and when the inventory rules change.

## The decision: the reader translates, the record decides

~~~ts
class NorthReader implements InventoryReader {
  read(file: InventoryFile): InventoryRecord[] {
    return parseJson(file).map((item) =>
      InventoryRecord.from({ code: item.code, quantity: item.qty }),
    );
  }
}
~~~

The reader only knows where each field lives in its supplier's JSON. `InventoryRecord.from` applies the rules that make a record valid and rejects it when they aren't met. When a format changes, you touch its reader; when a rule changes, you touch `InventoryRecord`.

~~~ts
class InventoryRecord {
  private constructor(
    public readonly code: string,
    public readonly quantity: number,
  ) {}

  static from(data: { code: string; quantity: number }): InventoryRecord {
    if (data.code.length !== 8) {
      throw new Error('Product code must have eight characters');
    }
    if (data.quantity < 0) {
      throw new Error('Quantity must not be negative');
    }
    return new InventoryRecord(data.code, data.quantity);
  }
}
~~~

## Three steps, one responsibility

Separating doesn't mean one class per step. The reader parses, maps fields and asks `InventoryRecord` to build the record, and it still has a single reason to change: its supplier's format. In this case, splitting it into `JsonParser`, `FieldMapper` and `RecordBuilder` would add pieces without us having identified separate reasons for each to change.

**What it costs:** there is one more piece, and you need to follow the call to `InventoryRecord.from` to find the rules. In return, inventory rules can change without modifying the format-reading logic, even with a single supplier. With several readers, it also avoids repeating those rules.

**A responsibility is recognized by the reason that makes it change, not by the number of steps it coordinates.**

*The importer now reads and validates. Next, the business wants to see what will be imported before confirming it.*
