import { t } from "@rbxts/t";
import { ResponseItemClass } from "responseItemClass";

export const responseItems: Record<string, ResponseItemClass> = {}
export const moduleEvents: Record<string, RBXScriptConnection> = {};

function DisconnectModuleEvent ( name: string ) {
    const event = moduleEvents[name]
    if ( event ) {
        event.Disconnect()
        moduleEvents[name] = undefined as never
    }
}

export function CreateResponseItem ( instance: ModuleScript | Instance ) {
    DisconnectModuleEvent( instance.GetFullName() )
    responseItems[instance.GetFullName()] = new ResponseItemClass( instance );
    print( "Added: ", instance.GetFullName() )
}

export function GetResponseItem ( instance: ModuleScript | Instance ) {
    return responseItems[instance.GetFullName()]
}

export function DestroyResponseItem ( instance: ModuleScript | Instance ) {
    responseItems[instance.GetFullName()] = undefined as never
    DisconnectModuleEvent( instance.GetFullName() )
}

export function DestroyResponseItemByName ( name: string ) {
    responseItems[name] = undefined as never
    DisconnectModuleEvent( name )
}
