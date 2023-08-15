import { ResponseItemClass } from "responseItemClass";

export const responseItems: Record<string, ResponseItemClass> = {}

export function CreateResponseItem ( instance: ModuleScript | Instance ) {
    responseItems[instance.GetFullName()] = new ResponseItemClass( instance );
}

export function GetResponseItem ( instance: ModuleScript | Instance ) {
    return responseItems[instance.GetFullName()]
}

export function DestroyResponseItem ( instance: ModuleScript | Instance ) {
    responseItems[instance.GetFullName()] = undefined as never
}
