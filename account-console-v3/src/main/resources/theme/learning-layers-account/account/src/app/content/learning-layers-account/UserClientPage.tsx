import * as React from 'react';
import {
    Button,
    DataList, DataListCell, DataListItem, DataListItemCells, DataListItemRow, DataListToggle,
    Form, FormGroup,
    Grid,
    GridItem, PageSection, PageSectionVariants, Stack, TextInput,
} from '@patternfly/react-core';
import { ContentPage } from '../ContentPage'
import { Msg } from '../../widgets/Msg'
import { AccountServiceContext } from '../../account-service/AccountServiceContext';
import { HttpResponse } from '../../account-service/account.service'
import {AngleUpIcon, MinusCircleIcon, TrashIcon} from "@patternfly/react-icons";
import {ContentAlert} from "../ContentAlert";

// can be found at /keycloak.v2/account/index.ftl
declare const authUrl: string;
declare const realm: string;

export interface ClientsPageProps {
}

export interface ClientsPageState {
    isUnlinkEnabled: boolean[];
    isDeleteEnabled: boolean[];
    // isRowOpen already here for later use and expanding the list of clients
    isRowOpen: boolean[];
    tokenInputEnabled: boolean;
    adminTok: string;
    clients: Client[];
}

export interface Client {
    clientId: string;
    name: string;
    description: string;
}


export class UserClientPage extends React.Component<ClientsPageProps, ClientsPageState> {
    static contextType = AccountServiceContext;
    context: React.ContextType<typeof AccountServiceContext>;

    public constructor(props: ClientsPageProps, context: React.ContextType<typeof AccountServiceContext>) {
        super(props);
        this.context = context;
        this.state = {
            isUnlinkEnabled: [],
            isDeleteEnabled: [],
            isRowOpen: [],
            tokenInputEnabled: false,
            adminTok: '',
            clients: []
        };

        this.fetchClients();
    }



    private fetchClients(): void {
        let url = authUrl + 'realms/' + realm + '/userClientAdministration/clients'
        this.context!.doGet<Client[]>(url).then((response: HttpResponse<Client[]>) => {
            const clients = response.data || [];
            this.setState({
                isUnlinkEnabled: new Array(clients.length).fill(false),
                isDeleteEnabled: new Array(clients.length).fill(false),
                isRowOpen: new Array(clients.length).fill(false),
                tokenInputEnabled: false,
                adminTok: '',
                clients: clients
            });
        });
    }

    private elementId(item: string, client: Client): string {
        return `application-${item}-${client.clientId}`;
    }

    private handleCreate() {
        return window.location.hash = 'userClients/client'
    }

    private handleDeleteClient(clientId: string, index: number) {
        if (this.state.isDeleteEnabled[index]){
            let url = authUrl + 'realms/' + realm + '/userClientAdministration/client/' + clientId;
            this.context!.doDelete(url).then((response: HttpResponse) => {
                if(response.ok) {
                    this.fetchClients();
                    ContentAlert.success('Client successfully deleted');
                } else {
                    ContentAlert.warning('Client could not be deleted.\n' +  response.status + ' ' + response.statusText);
                }
            })
        } else {
            let tmp = new Array(this.state.clients.length).fill(false);
            tmp[index] = true;
            this.setState({
                isDeleteEnabled: tmp,
                isUnlinkEnabled: new Array(this.state.clients.length).fill(false),
            })
        }

    }

    private handleUnlinkClient(clientId: string, index: number) {
        if (this.state.isUnlinkEnabled[index]){
            let url = authUrl + 'realms/' + realm + '/userClientAdministration/access/' + clientId;
            this.context!.doDelete(url).then((response: HttpResponse) => {
                if (response.ok) {
                    this.fetchClients();
                    ContentAlert.success('Client successfully unlinked from you');
                } else {
                    ContentAlert.warning('Client could not be unlinked.\n' + response.status + ' ' + response.statusText);
                }
            })
        } else {
            let tmp = new Array(this.state.clients.length).fill(false);
            tmp[index] = true;
            this.setState({
                isUnlinkEnabled: tmp,
                isDeleteEnabled: new Array(this.state.clients.length).fill(false)
            })
        }
    }

    private handleManageClient(clientId: string) {
        window.location.hash = 'userClients/client/' + clientId;
    }

    private handleAddClient = (event: React.FormEvent<HTMLFormElement>): void => {
        event.preventDefault();
        const form = event.target as HTMLFormElement;
        const isValid = form.checkValidity();
        if (isValid && this.state.adminTok != '') {
            let url = authUrl + 'realms/' + realm + '/userClientAdministration/access';
            this.context!.doPost<HttpResponse>(url, {adminToken: this.state.adminTok})
                .then((response: HttpResponse) => {
                    if(response.ok) {
                        this.fetchClients();
                        ContentAlert.success(Msg.localize('successfullClientCreation'));
                    } else {
                        ContentAlert.warning('Could not link client.\n' + response.status + ' ' + response.statusText);
                    }
                });
        } else {
            ContentAlert.warning('Given administration token invalid.');
        }

    }

    private handleChangeAdminTok = (value: string, event: React.FormEvent<HTMLInputElement>) => {
        const target = event.currentTarget;
        const name = target.name;

        this.setState({
            adminTok: value
        });
    }

    private toggleLinkClient = () => {
        this.setState({
            tokenInputEnabled: !this.state.tokenInputEnabled,
            adminTok: '',
        })
    }

    public render(): React.ReactNode {
        return (
            <ContentPage title="personalClientTitle" introMessage="personalClientDescription">
                <PageSection isFilled variant={PageSectionVariants.light}>
                    <Stack>
                        <Grid>
                            <GridItem offset={12} span={1}>
                                <div style={{float: 'left'}}>
                                    <Button id="add-client-btn" variant="control" onClick={this.toggleLinkClient}>
                                        <Msg msgKey="doAddClient" />
                                    </Button>
                                </div>
                                <div style={{float: 'right'}}>
                                    <Button id="create-btn" variant="control" onClick={this.handleCreate}>
                                        <Msg msgKey="doCreateClient" />
                                    </Button>
                                </div>
                            </GridItem>
                        </Grid>
                        {this.state.tokenInputEnabled && (
                            <React.Fragment>
                                <Form isHorizontal onSubmit={event => this.handleAddClient(event)}>
                                    <FormGroup label={Msg.localize('adminToken')}
                                               fieldId='admin-token'
                                    >
                                        <TextInput
                                            type='text'
                                            id='admin-token'
                                            name='adminTok'
                                            value={this.state.adminTok}
                                            onChange={this.handleChangeAdminTok}
                                        />
                                        <Grid>
                                            <GridItem offset={12} span={1}>
                                                <div style={{float: 'left'}}>
                                                    <Button
                                                        id='clear-tok-field-btn'
                                                        variant='tertiary'
                                                        onClick={() => this.setState({ adminTok: ''})}
                                                    >
                                                        <Msg msgKey='doClearTokenField' />
                                                    </Button>
                                                </div>
                                                <div style={{float: 'right'}}>
                                                    <Button
                                                        type="submit"
                                                        id="add-client-btn"
                                                        variant="primary"
                                                    >
                                                        <Msg msgKey="doAddClient" />
                                                    </Button>
                                                </div>
                                            </GridItem>
                                        </Grid>
                                    </FormGroup>
                                </Form>
                            </React.Fragment>
                        )}
                        <DataList id="client-list" aria-label="Clients">
                            <DataListItem id="client-list-header" aria-labelledby="Column names">
                                <DataListItemRow>
                                    // invisible toggle allows headings to line up properly
                                    <span style={{ visibility: 'hidden', height: 55 }}>
                                        <DataListToggle
                                            isExpanded={false}
                                            id='applications-list-header-invisible-toggle'
                                            aria-controls="hidden"
                                        />
                                    </span>
                                    <DataListItemCells
                                        dataListCells={[
                                            <DataListCell key='client-list-client-id-header' width={2} className="pf-u-pt-md">
                                                <strong><Msg msgKey='clientId' /></strong>
                                            </DataListCell>,
                                            <DataListCell key='client-list-client-name-header' width={2} className="pf-u-pt-md">
                                                <strong><Msg msgKey='clientName' /></strong>
                                            </DataListCell>,
                                            <DataListCell key='client-list-client-description-header' width={2} className="pf-u-pt-md">
                                                <strong><Msg msgKey='clientDescription' /></strong>
                                            </DataListCell>,
                                            <DataListCell key='client-list-client-delete-header' width={1} className="pf-u-pt-md">
                                                <Grid>
                                                    <GridItem span={6}>
                                                        <strong><Msg msgKey='clientUnlink'/></strong>
                                                    </GridItem>
                                                    <GridItem span={6}>
                                                        <strong><Msg msgKey='clientDelete'/></strong>
                                                    </GridItem>
                                                </Grid>
                                            </DataListCell>,
                                        ]}
                                    />
                                </DataListItemRow>
                            </DataListItem>
                            {this.state.clients.map((client: Client, appIndex: number) => {
                                return (
                                    <DataListItem id={this.elementId("client-id", client)} key={'client-' + appIndex} aria-labelledby="client-list" isExpanded={this.state.isRowOpen[appIndex]}>
                                        <DataListItemRow>
                                            {/*<DataListToggle*/}
                                            {/*    onClick={() => this.onToggle(appIndex)}*/}
                                            {/*    isExpanded={this.state.isRowOpen[appIndex]}*/}
                                            {/*    id={this.elementId('toggle', application)}*/}
                                            {/*    aria-controls={this.elementId("expandable", application)}*/}
                                            {/*/>*/}
                                            <DataListItemCells
                                                dataListCells={[
                                                    <DataListCell id={this.elementId('id', client)} width={2} key={'id-' + appIndex}>
                                                        <Button component="a" variant="link" onClick={() => this.handleManageClient(client.clientId)}>
                                                            { client.clientId }
                                                        </Button>
                                                    </DataListCell>,
                                                    <DataListCell id={this.elementId('name', client)} width={2} key={'name-' + appIndex}>
                                                        { client.name || '---' }
                                                    </DataListCell>,
                                                    <DataListCell id={this.elementId('description', client)} width={2} key={'description-' + appIndex}>
                                                        { client.description || '---'}
                                                    </DataListCell>,
                                                    <DataListCell id={this.elementId('delete', client)} width={1} key={'delete-' + appIndex}>
                                                        <Grid>
                                                            <GridItem span={6}>
                                                                <Grid>
                                                                    {this.state.isUnlinkEnabled[appIndex] && (
                                                                        <GridItem span={12}>
                                                                            <p style={{color: 'red'}}>
                                                                                <Msg msgKey="deleteClientWarning" />
                                                                            </p>
                                                                        </GridItem>
                                                                    )}
                                                                    <GridItem span={6}>
                                                                        <Button component="a" variant="secondary" onClick={() => this.handleUnlinkClient(client.clientId, appIndex)}>
                                                                            <MinusCircleIcon/>
                                                                        </Button>
                                                                    </GridItem>
                                                                    {this.state.isUnlinkEnabled[appIndex] && (
                                                                        <GridItem span={6}>
                                                                            <Button component="a" variant="tertiary" onClick={() => this.setState({
                                                                                isUnlinkEnabled: new Array(this.state.clients.length).fill(false)
                                                                            })}>
                                                                                <AngleUpIcon/>
                                                                            </Button>
                                                                        </GridItem>
                                                                    )}
                                                                </Grid>
                                                            </GridItem>
                                                            <GridItem span={6}>
                                                                <Grid>
                                                                    {this.state.isDeleteEnabled[appIndex] && (
                                                                        <GridItem span={12} >
                                                                            <p style={{color: 'red'}}>
                                                                                <Msg msgKey="deleteClientWarning" />
                                                                            </p>
                                                                        </GridItem>
                                                                    )}
                                                                    <GridItem span={6}>
                                                                        <Button component="a" variant="danger" onClick={() => this.handleDeleteClient(client.clientId, appIndex)}>
                                                                            <TrashIcon/>
                                                                        </Button>
                                                                    </GridItem>
                                                                    {this.state.isDeleteEnabled[appIndex] && (
                                                                        <GridItem span={6}>
                                                                            <Button component="a" variant="tertiary" onClick={() => this.setState({
                                                                                isDeleteEnabled: new Array(this.state.clients.length).fill(false)
                                                                            })}>
                                                                                <AngleUpIcon/>
                                                                            </Button>
                                                                        </GridItem>
                                                                    )}
                                                                </Grid>
                                                            </GridItem>
                                                        </Grid>
                                                    </DataListCell>
                                                ]}
                                            />
                                        </DataListItemRow>
                                    </DataListItem>
                                )
                            })}
                        </DataList>
                    </Stack>
                </PageSection>
            </ContentPage>
        );
    };
}