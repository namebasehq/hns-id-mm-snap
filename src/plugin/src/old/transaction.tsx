import {
  Box,
  Text,
  Input,
  Dropdown,
  DropdownElement,
  Checkbox,
  Radio,
  Button,
  Address,
  Option,
} from "@metamask/snaps-sdk/jsx";
import { HandshakeRPC } from "../hns-rpc";
import { SnapLogger } from "../logger";
const rpc = new HandshakeRPC(
  "http://188.166.151.44:12037/",
  "hs_f6d2e4a8c9b3719k5n2m4p7q8"
);
const logger = SnapLogger.getInstance();

export async function showTransactionInterface() {
  try {
    const interfaceId = await snap.request({
      method: "snap_createInterface",
      params: {
        ui: (
          <Box>
            <Text>Test Input:</Text>
            <Input name="test-input" placeholder="Enter text here..." />
            <Box key="test-box">
              <Text>Test Dropdown:</Text>
              <Dropdown name="test-dropdown">
                <Option value="1">Option 1</Option>
              </Dropdown>
            </Box>
            <Button name="submit">Submit</Button>
          </Box>
        ),
      },
    });

    return snap.request({
      method: "snap_dialog",
      params: {
        type: "alert",
        id: interfaceId,
      },
    });
  } catch (error) {
    console.error("Error creating test interface:", error);
    throw error;
  }
}
